// Snapshot proxy for the SciTeens Meilisearch Cloud Run container.
//
// Sits on the public port in front of Meilisearch (which binds loopback
// only) and reverse-proxies all traffic, adding one extra endpoint:
//
//	POST /__snapshot_now__ — synchronously creates a Meilisearch snapshot,
//	waits for the task to finish, uploads it to gs://$MEILI_SNAPSHOT_BUCKET/latest.snapshot,
//	and only then responds.
//
// The endpoint exists so Cloud Scheduler can drive snapshots as HTTP
// requests: under request-based billing (cpu throttling between requests)
// background loops get starved of CPU and their GCS uploads fail, so all
// snapshot work must happen while a request is in flight.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"google.golang.org/api/idtoken"
)

const snapshotPath = "/__snapshot_now__"

var (
	upstream       = envOr("MEILI_UPSTREAM", "http://127.0.0.1:7701")
	masterKey      = os.Getenv("MEILI_MASTER_KEY")
	snapshotBucket = os.Getenv("MEILI_SNAPSHOT_BUCKET")
	snapDir        = envOr("MEILI_SNAP_DIR", "/meili_data/snapshots")
	schedulerSA    = os.Getenv("SCHEDULER_SA_EMAIL")
)

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	port := envOr("PORT", "7700")

	target, err := url.Parse(upstream)
	if err != nil {
		log.Fatalf("proxy: bad MEILI_UPSTREAM %q: %v", upstream, err)
	}
	rp := httputil.NewSingleHostReverseProxy(target)

	mux := http.NewServeMux()
	mux.HandleFunc(snapshotPath, handleSnapshotNow)
	mux.Handle("/", rp)

	log.Printf("proxy: listening on :%s, upstream %s", port, target)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

// handleSnapshotNow authenticates the caller (Cloud Scheduler's OIDC token
// for SCHEDULER_SA_EMAIL, or the Meilisearch master key for manual ops),
// then runs snapshot -> wait -> upload before responding.
func handleSnapshotNow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := authorize(r); err != nil {
		log.Printf("proxy: auth rejected: %v", err)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if snapshotBucket == "" || masterKey == "" {
		http.Error(w, "snapshot upload not configured", http.StatusServiceUnavailable)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Minute)
	defer cancel()

	if err := createAndWaitSnapshot(ctx); err != nil {
		log.Printf("proxy: snapshot failed: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	file, err := newestSnapshot()
	if err != nil {
		log.Printf("proxy: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	n, err := uploadSnapshot(ctx, file)
	if err != nil {
		log.Printf("proxy: upload failed: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("proxy: uploaded %s (%d bytes) to gs://%s/latest.snapshot", file, n, snapshotBucket)
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"uploaded":%q,"bytes":%d}`+"\n", filepath.Base(file), n)
}

// authorize accepts either the master key (manual ops) or a Google-signed
// OIDC ID token whose email claim matches the scheduler service account.
func authorize(r *http.Request) error {
	tok := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if tok == "" {
		return fmt.Errorf("missing bearer token")
	}
	if masterKey != "" && tok == masterKey {
		return nil
	}
	if schedulerSA == "" {
		return fmt.Errorf("SCHEDULER_SA_EMAIL not set")
	}
	// Audience is left unchecked: the email claim on a Google-signed token
	// is the gate, and the run.app URL this service answers to is not
	// knowable at container build time.
	payload, err := idtoken.Validate(r.Context(), tok, "")
	if err != nil {
		return fmt.Errorf("invalid id token: %w", err)
	}
	if payload.Claims["email"] != schedulerSA {
		return fmt.Errorf("token email %v is not the scheduler service account", payload.Claims["email"])
	}
	return nil
}

// createAndWaitSnapshot asks Meilisearch for a snapshot and polls the task
// until it succeeds or fails.
func createAndWaitSnapshot(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, upstream+"/snapshots", nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+masterKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("requesting snapshot: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("snapshot request returned %s", resp.Status)
	}

	var task struct {
		TaskUID int `json:"taskUid"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&task); err != nil {
		return fmt.Errorf("decoding snapshot task: %w", err)
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(time.Second):
		}

		treq, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/tasks/%d", upstream, task.TaskUID), nil)
		if err != nil {
			return err
		}
		treq.Header.Set("Authorization", "Bearer "+masterKey)
		tresp, err := http.DefaultClient.Do(treq)
		if err != nil {
			return fmt.Errorf("polling task %d: %w", task.TaskUID, err)
		}
		var status struct {
			Status string `json:"status"`
			Error  struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		derr := json.NewDecoder(tresp.Body).Decode(&status)
		tresp.Body.Close()
		if derr != nil {
			return fmt.Errorf("decoding task %d: %w", task.TaskUID, derr)
		}

		switch status.Status {
		case "succeeded":
			return nil
		case "failed", "canceled":
			return fmt.Errorf("snapshot task %d %s: %s", task.TaskUID, status.Status, status.Error.Message)
		}
	}
}

// newestSnapshot returns the most recently modified .snapshot file.
func newestSnapshot() (string, error) {
	matches, err := filepath.Glob(filepath.Join(snapDir, "*.snapshot"))
	if err != nil || len(matches) == 0 {
		return "", fmt.Errorf("no .snapshot files found in %s", snapDir)
	}
	newest := matches[0]
	var newestTime time.Time
	for _, m := range matches {
		info, err := os.Stat(m)
		if err != nil {
			continue
		}
		if info.ModTime().After(newestTime) {
			newest, newestTime = m, info.ModTime()
		}
	}
	return newest, nil
}

// uploadSnapshot streams the snapshot file to GCS using an access token
// from the Cloud Run metadata server (same flow as the old snapshot-sync.sh).
func uploadSnapshot(ctx context.Context, file string) (int64, error) {
	treq, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", nil)
	if err != nil {
		return 0, err
	}
	treq.Header.Set("Metadata-Flavor", "Google")
	tresp, err := http.DefaultClient.Do(treq)
	if err != nil {
		return 0, fmt.Errorf("metadata token request: %w", err)
	}
	defer tresp.Body.Close()
	var token struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(tresp.Body).Decode(&token); err != nil || token.AccessToken == "" {
		return 0, fmt.Errorf("could not decode metadata token")
	}

	f, err := os.Open(file)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return 0, err
	}

	uploadURL := fmt.Sprintf(
		"https://storage.googleapis.com/upload/storage/v1/b/%s/o?uploadType=media&name=latest.snapshot",
		snapshotBucket)
	ureq, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, f)
	if err != nil {
		return 0, err
	}
	ureq.Header.Set("Authorization", "Bearer "+token.AccessToken)
	ureq.Header.Set("Content-Type", "application/octet-stream")
	ureq.ContentLength = info.Size()

	uresp, err := http.DefaultClient.Do(ureq)
	if err != nil {
		return 0, fmt.Errorf("gcs upload: %w", err)
	}
	defer uresp.Body.Close()
	if uresp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(uresp.Body, 512))
		return 0, fmt.Errorf("gcs upload returned %s: %s", uresp.Status, body)
	}
	return info.Size(), nil
}
