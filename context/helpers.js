// File containing helper functions
import { doc, getDoc } from "@firebase/firestore";

export async function createUniqueSlug(firestore, check_slug, collection, num) {
    const doc_ref = doc(firestore, collection, check_slug)
    const res = await getDoc(doc_ref)
    if (res.exists()) {
        if (num == 1) {
            check_slug = check_slug + "-" + 1;
        } else {
            check_slug = check_slug.replace(
                /[0-9]+(?!.*[0-9])/,
                function (match) {
                    return parseInt(match, 10) + 1;
                }
            );
        }

        num += 1;
        return createUniqueSlug(firestore, check_slug, collection, num);
    } else {
        return check_slug;
    }
}