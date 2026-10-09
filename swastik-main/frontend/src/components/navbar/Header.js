// Landing page header; moved under components/navbar (Bahmni-style structure)
import "./Header.css";
import logo from "../../assets/swasstiklogo.png";

function Header() {
  return (
    <header className="header">
      <img src={logo} alt="Swastik Hospital" />
    </header>
  );
}

export default Header;
