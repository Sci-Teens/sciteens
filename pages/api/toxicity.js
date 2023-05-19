import { post } from '../../context/helpers.js'

export default async function handler(req, res) {
    if (req.method == 'POST') {
        const postLink =
            'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=' +
            process.env.NEXT_PUBLIC_GM_API_KEY

        const response = await post(postLink, {
            comment: { text: req.body.text },
            languages: ['en'],
            requestedAttributes: {
                TOXICITY: {},
                PROFANITY: {},
                INSULT: {},
            },
        })
        res.status(200).json(response);
    }
}