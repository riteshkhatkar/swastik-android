// Landing page footer; moved under components/Footer (Bahmni-style structure)
import "./Footer.css";
import orelse from "../../assets/orelse.png";

function Footer() {
  return (
    <footer className="footer">
      <img src={orelse} alt="Orelese" />
    </footer>
  );
}

export default Footer;
