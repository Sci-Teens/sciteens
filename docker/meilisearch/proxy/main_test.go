package main

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAuthorizeRequiresConfiguredAudience(t *testing.T) {
	originalMasterKey := masterKey
	originalSchedulerSA := schedulerSA
	originalAudience := snapshotAudience
	t.Cleanup(func() {
		masterKey = originalMasterKey
		schedulerSA = originalSchedulerSA
		snapshotAudience = originalAudience
	})

	masterKey = ""
	schedulerSA = "scheduler@example.com"
	snapshotAudience = ""

	req := httptest.NewRequest("POST", snapshotPath, nil)
	req.Header.Set("Authorization", "Bearer signed-token")

	err := authorize(req)
	if err == nil || !strings.Contains(err.Error(), "SNAPSHOT_AUDIENCE not set") {
		t.Fatalf("authorize returned %v", err)
	}
}
