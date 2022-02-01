![SciTeens Logo](./public/assets/sciteens_logo_main.svg)
# Welcome to the SciTeens Repo!
This is the work-in-progress version of the open-source [SciTeens](https://sciteens.org) platform. This application is built in Next JS (A Server-Side Rendered React JS framework.) If you encounter issues with the website, please fork our site and commit fixes or detail the issues in the issues tab on GitHub. If you just want to explore the code, then enjoy!

# Learning
If you'd like to learn about web development, you can explore this repository and the tools that we use. We've provided the tools that we use below, as well as some good learning guides for getting started with each of these tools. 
- **Tailwind CSS**<br>
[Tailwind CSS](https://tailwindcss.com/) is a class-based CSS framework that allows us to style our website. It's pretty straightforward to learn, the [documentation](https://tailwindcss.com/docs/utility-first) is fantastic, and you can [try it yourself](https://play.tailwindcss.com/) without downloading anything. 
- **React**<br>
React is a framework that allows us to create the functionality for each of our pages. To get started, be sure to check out [this website](https://beta.reactjs.org/learn)
- **Next JS**<br>
Next JS is built on top of React, and allows users to find our website easier via search engines like Google using a concept called [Server Side Rendering](https://www.freecodecamp.org/news/what-exactly-is-client-side-rendering-and-hows-it-different-from-server-side-rendering-bd5c786b340d/) or [Static Site Generation](https://dev.to/matfrana/server-side-rendering-vs-static-site-generation-17nf) (SSR or SSG). To learn more about Next JS and the concepts of SSR and SSG, check out the [Next JS docs](https://nextjs.org/docs/getting-started).
- **Firebase**<br>
Firebase is a fantastic tool for easily managing the back-end of an application from the front-end. Firebase takes care of managing users, website analytics, as well as storing data in a [NoSQL database](https://en.wikipedia.org/wiki/NoSQL). To get started with learning Firebase, we recommend checking out [this website](https://firebase.google.com/docs/web/setup) or watching [this video](https://www.youtube.com/watch?v=9kRgVxULbag). Also, be sure to check out the official Firebase YouTube channel [https://www.youtube.com/c/firebase](https://www.youtube.com/c/firebase)
- **Docker**<br>
To host our website, we use a tool called [Docker](https://www.zdnet.com/article/what-is-docker-and-why-is-it-so-darn-popular/) paired with [Google Cloud Run](https://cloud.google.com/run/). These tools allow us to "bundle" our site (almost like we're packaging our website up into a box) and then putting that "box" on Google Cloud Run for other people to access at https://sciteens.org. 
# Getting Started
Before you begin, make sure that you have both [Git](https://git-scm.com/downloads) and [Node JS](https://nodejs.org/en/download/) installed on your computer. To get started with the code, follow the steps below:
1. Clone the repository by typing in `git clone https://github.com/Sci-Teens/sciteens.git` into your command line. If you don't have access, you can fork the repository instead.
2. Type in `cd sciteens` to the command line and hit enter.
3. Type in `npm install` to the command line and hit enter. This will download all necessary packages
4. Type in `npm run dev` and visit localhost:3000 in your browser. This will show the development build!
5. If you encounter an error at the step above, it's likely because you don't have access to the API keys. If you'd like to join the team to contribute to the website, [reach out](mailto:info@sciteens.org)!
