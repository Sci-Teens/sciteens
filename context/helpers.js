// File containing helper functions
import { doc, getDoc } from "@firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from '@firebase/auth'

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

export async function providerSignIn(auth, firestore, router, setProfile) {
    const provider = new GoogleAuthProvider()
    try {
        const res = await signInWithPopup(auth, provider)
        const addInfo = await getAdditionalUserInfo(res)
        if (addInfo.isNewUser) {
            // Complete profile
            router.push(`/signup/finish${res.user.displayName ? `?first_name=${res.user.displayName.split(' ')[0]}&last_name=${res.user.displayName.split(' ')[1]}` : ''}`)
        }

        else {
            const prof = await getDoc(doc(firestore, 'profiles', res.user.uid))
            setProfile(prof.data())
            if (router.query.ref) {
                let ref = router.query.ref.split("|")
                let section = ref[0]
                let id = ref[1]
                if (section == "projects") {
                    section = "project"
                }
                router.push(`/${section}/${id}`)
            } else {
                router.push(prof.data().slug ? `/profile/${prof.data().slug}` : '/')
            }
        }
    } catch (e) {
        console.error(e)
    }
    return true;
}

export function validatePassword(password, t) {
    // Validate a password, with support for translations (t)
    const isWhitespace = /^(?=.*\s)/;
    const isContainsSymbol =
        /^(?=.*[~`!@#$%^&*()--+={}\[\]|\\:;"'<>,.?/_₹])/;
    const isContainsUppercase = /^(?=.*[A-Z])/;
    const isContainsLowercase = /^(?=.*[a-z])/;
    const isContainsNumber = /^(?=.*[0-9])/;
    const isValidLength = /^.{8,100}$/;

    if (isWhitespace.test(password)) {
        return t("auth.password_whitespace")
    }

    else if (!isContainsUppercase.test(password)) {
        return t("auth.password_uppercase")
    }

    else if (!isContainsLowercase.test(password)) {
        return t("auth.password_lowercase")
    }

    else if (!isContainsNumber.test(password)) {
        return t("auth.password_digit")
    }


    else if (!isContainsSymbol.test(password)) {
        return t("auth.password_symbol")
    }

    else if (!isValidLength.test(password)) {
        return t("auth.password_length")
    }

    else {
        return ""
    }
}