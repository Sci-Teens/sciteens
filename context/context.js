import { createContext } from 'react';

export const AppContext = createContext({
    fieldImages: {
        Biology: "https://source.unsplash.com/Mm1VIPqd0OA/",
        Chemistry: "https://source.unsplash.com/pwcKF7L4-no/",
        "Cognitive Science": "https://source.unsplash.com/58Z17lnVS4U/",
        "Computer Science": "https://source.unsplash.com/f77Bh3inUpE/",
        "Earth Science": "https://source.unsplash.com/vhSz50AaFAs/",
        "Electrical Engineering": "https://source.unsplash.com/ImcUkZ72oUs/",
        "Environmental Science": "https://source.unsplash.com/x8ZStukS2PM/",
        Mathematics: "https://source.unsplash.com/ihqB-c8C7Bc/",
        "Mechanical Engineering": "https://source.unsplash.com/Hld-BtdRdPU/",
        Medicine: "https://source.unsplash.com/yo01Z-9HQAw/",
        Physics: "https://source.unsplash.com/KUeJcc4YUug/",
        "Space Science": "https://source.unsplash.com/VZ_GDBK98FQ/",
    },
    profile: {},
    user: {},
    notifications: [],
});

// export function AppWrapper({ children }) {
//     let sharedState = {

//     }

//     return (
//         <AppContext.Provider value={sharedState}>
//             {children}
//         </AppContext.Provider>
//     );
// }

// export function useAppContext() {
//     return useContext(AppContext);
// }