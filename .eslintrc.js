module.exports = {
    overrides: [
        {
            extends: [
                'prettier/@typescript-eslint',
                'plugin:prettier/recommended',
            ],
            rules: {
                'prettier/prettier': ['error', {}, { usePrettierrc: true }],
            },
        },
    ],
}