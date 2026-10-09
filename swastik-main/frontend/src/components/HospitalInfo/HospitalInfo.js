import { FaMapMarkerAlt, FaPhone } from "react-icons/fa";
import "./HospitalInfo.css";

const ADDRESS =
  "Basant-Bahar Road, Behind Nashte Mangal Karyalay, Near Mahavir Garden, Kolhapur.";
const PHONE = "(0231) 2658835";

function HospitalInfo({ variant = "compact", showIcons = true }) {
  const isCompact = variant === "compact";
  return (
    <div className={`hospital-info hospital-info--${variant}`}>
      {isCompact ? (
        <>
          {showIcons && <FaMapMarkerAlt className="hospital-info-icon" aria-hidden />}
          <span className="hospital-info-address">{ADDRESS}</span>
          <span className="hospital-info-sep"> · </span>
          {showIcons && <FaPhone className="hospital-info-icon" aria-hidden />}
          <span className="hospital-info-phone">{PHONE}</span>
        </>
      ) : (
        <>
          <div className="hospital-info-line">
            {showIcons && <FaMapMarkerAlt className="hospital-info-icon" aria-hidden />}
            <span className="hospital-info-address">{ADDRESS}</span>
          </div>
          <div className="hospital-info-line">
            {showIcons && <FaPhone className="hospital-info-icon" aria-hidden />}
            <span className="hospital-info-phone">{PHONE}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default HospitalInfo;
export { ADDRESS, PHONE };
