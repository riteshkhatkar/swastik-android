import { Link } from "react-router-dom";
import "./Doctors.css";
import drPm from "../../assets/dr_pm.png";
import drNikhil from "../../assets/dr_nikhil.png";

const DOCTORS = [
  {
    id: 1,
    name: "Dr. P. M. Chougule",
    specialty: "M.D. Psychological Med., D.P.M. (Mumbail M. B. F. L. P. S, M. A. P. A. (USA)",
    photo: drPm,
    experience: "22 years"
  },
  {
    id: 2,
    name: "Dr. Nikhil Chougule",
    specialty: "M.D. Psychiatry (Mumbai), M. D. Medicine (Russia)",
    photo: drNikhil,
    experience: "12 years"
  },
];

function Doctors() {
  return (
    <section className="home-doctors" id="doctors">
      <div className="home-doctors__inner">
        <h2 className="home-doctors__title">Expert Psychiatric Care</h2>
        <p className="home-doctors__intro">
          Dedicated specialists committed to your mental health and well-being.
        </p>
        <div className="home-doctors__grid">
          {DOCTORS.map((doctor) => (
            <div key={doctor.id} className="home-doctors__card">
              <div className="home-doctors__img-wrapper">
                <img
                  src={doctor.photo}
                  alt={doctor.name}
                  className="home-doctors__img"
                />
                <span className="home-doctors__exp-badge">
                  💼 {doctor.experience}
                </span>
              </div>
              <div className="home-doctors__content">
                <h3 className="home-doctors__name">{doctor.name}</h3>
                <p className="home-doctors__specialty">{doctor.specialty}</p>
                <Link
                  to={`/patient-portal/appointments?docId=${doctor.id}`}
                  className="home-doctors__booking-link"
                >
                  Book Appointment <span className="arrow">›</span>
                </Link>

              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


export default Doctors;
