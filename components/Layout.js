import NavBar from "./NavBar";
import Footer from "./Footer";

// Firebase 
export default function Layout({ children }) {
    return (
        <div className="w-full h-full font-sciteens">
            <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200;0,300;0,400;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet" />
            <NavBar></NavBar>
            <div>{children}</div>
            <Footer></Footer>
        </div>
    )
}