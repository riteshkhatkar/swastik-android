import { FaUserMd } from "react-icons/fa";
import "./DoctorsInfo.css";

const DOCTORS = [
  {
    name: "Dr. P. M. Chougule",
    specialization: "Psychological Medicine & Psychiatry",
    qualifications: ["M.D. Psychological Med.", "D.P.M. (Mumbail)", "M.B.F.L.P.S", "M.A.P.A. (USA)"],
  },
  {
    name: "Dr. Nikhil Chougule",
    specialization: "Psychiatry & Medicine",
    qualifications: ["M.D. Psychiatry (Mumbai)", "M.D. Medicine (Russia)"],
  },
];

function DoctorsInfo({ title = "Consultant Doctors", compact = false }) {
  return (
    <div className={`doctors-info-card ${compact ? "doctors-info-card--compact" : ""}`}>
      <h3 className="doctors-info-title"><FaUserMd /> {title}</h3>
      <div className="doctors-info-list">
        {DOCTORS.map((doc) => (
          <div key={doc.name} className="doctors-info-item">
            <div className="doctors-info-name">{doc.name}</div>
            <div className="doctors-info-spec">{doc.specialization}</div>
            <ul className="doctors-info-qual">
              {doc.qualifications.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DoctorsInfo;
