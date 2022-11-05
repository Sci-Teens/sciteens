// File containing helper functions
import { doc, getDoc } from '@firebase/firestore'
import {
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
} from '@firebase/auth'
import { useState, useRef, useEffect } from 'react'

export async function createUniqueSlug(
  firestore,
  check_slug,
  collection,
  num
) {
  const doc_ref = doc(firestore, collection, check_slug)
  const res = await getDoc(doc_ref)
  if (res.exists()) {
    if (num == 1) {
      check_slug = check_slug + '-' + 1
    } else {
      check_slug = check_slug.replace(
        /[0-9]+(?!.*[0-9])/,
        function (match) {
          return parseInt(match, 10) + 1
        }
      )
    }

    num += 1
    return createUniqueSlug(
      firestore,
      check_slug,
      collection,
      num
    )
  } else {
    return check_slug
  }
}

export async function providerSignIn(
  auth,
  firestore,
  router,
  setProfile
) {
  const provider = new GoogleAuthProvider()
  try {
    const res = await signInWithPopup(auth, provider)
    const addInfo = await getAdditionalUserInfo(res)
    if (addInfo.isNewUser) {
      // Complete profile
      router.push(
        `/signup/finish${res.user.displayName
          ? `?first_name=${res.user.displayName.split(' ')[0]
          }&last_name=${res.user.displayName.split(' ')[1]
          }`
          : ''
        }`
      )
    } else {
      const prof = await getDoc(
        doc(firestore, 'profiles', res.user.uid)
      )
      setProfile(prof.data())
      if (router.query.ref) {
        let ref = router.query.ref.split('|')
        let section = ref[0]
        let id = ref[1]
        if (section == 'projects') {
          section = 'project'
        }
        router.push(`/${section}/${id}`)
      } else {
        router.push(
          prof.data().slug
            ? `/profile/${prof.data().slug}`
            : '/'
        )
      }
    }
  } catch (e) {
    console.error(e)
  }
  return true
}

export function getTranslatedFieldsDict(t) {
  // Returns dictionary of translated fields
  const FIELD_NAMES = {
    All: t('fields.all'),
    Biology: t('fields.biology'),
    Chemistry: t('fields.chemistry'),
    'Cognitive Science': t('fields.cognitive_science'),
    'Computer Science': t('fields.computer_science'),
    'Earth Science': t('fields.earth_science'),
    'Electrical Engineering': t(
      'fields.electrical_engineering'
    ),
    'Environmental Science': t(
      'fields.environmental_science'
    ),
    Mathematics: t('fields.mathematics'),
    'Mechanical Engineering': t(
      'fields.mechanical_engineering'
    ),
    Medicine: t('fields.medicine'),
    Physics: t('fields.physics'),
    'Space Science': t('fields.space_science'),
    'Fall 2022 Science Fair': t('fields.fall_2022_science_fair'),
  }

  return FIELD_NAMES
}

export function validatePassword(password, t) {
  // Validate a password, with support for translations (t)
  const isWhitespace = /^(?=.*\s)/
  const isContainsSymbol =
    /^(?=.*[~`!@#$%^&*()--+={}\[\]|\\:;"'<>,.?/_₹])/
  const isContainsUppercase = /^(?=.*[A-Z])/
  const isContainsLowercase = /^(?=.*[a-z])/
  const isContainsNumber = /^(?=.*[0-9])/
  const isValidLength = /^.{8,100}$/

  if (isWhitespace.test(password)) {
    return t('auth.password_whitespace')
  } else if (!isContainsUppercase.test(password)) {
    return t('auth.password_uppercase')
  } else if (!isContainsLowercase.test(password)) {
    return t('auth.password_lowercase')
  } else if (!isContainsNumber.test(password)) {
    return t('auth.password_digit')
  } else if (!isContainsSymbol.test(password)) {
    return t('auth.password_symbol')
  } else if (!isValidLength.test(password)) {
    return t('auth.password_length')
  } else {
    return ''
  }
}

export function useIntersectionObserver(
  ref,
  options,
  forward = true
) {
  const [element, setElement] = useState(null)
  const [isIntersecting, setIsIntersecting] =
    useState(false)
  const observer = useRef(null)

  const cleanOb = () => {
    if (observer.current) {
      observer.current.disconnect()
    }
  }

  useEffect(() => {
    setElement(ref.current)
  }, [ref])

  useEffect(() => {
    if (!element) return
    cleanOb()
    const ob = (observer.current = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting
        if (!forward) {
          setIsIntersecting(isElementIntersecting)
        } else if (
          forward &&
          !isIntersecting &&
          isElementIntersecting
        ) {
          setIsIntersecting(isElementIntersecting)
          cleanOb()
        }
      },
      { ...options }
    ))
    ob.observe(element)
    return () => {
      cleanOb()
    }
  }, [element, options])

  return isIntersecting
}

function convertToJSON(res) {
  if (!res.ok) {
    throw `API request failed with response status ${res.status} and text: ${res.statusText}`
  }

  return res
    .clone() // clone so that the original is still readable for debugging
    .json() // start converting to JSON object
    .catch((error) => {
      // throw an error containing the text that couldn't be converted to JSON
      return res.text().then((text) => {
        throw `API request's result could not be converted to a JSON object: \n${text}`
      })
    })
}

export function post(endpoint, params = {}) {
  console.log(endpoint)
  return fetch(endpoint, {
    method: 'post',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(params),
  })
    .then(convertToJSON)
    .catch((error) => {
      throw `POST request to ${endpoint} failed with error:\n${error}`
    })
}
