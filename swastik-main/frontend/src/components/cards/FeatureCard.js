// Reusable feature card for landing page; moved under components/cards (Bahmni-style structure)
import "./FeatureCard.css";

function FeatureCard({ icon, title }) {
  return (
    <div className="feature-card">
      <div className="card-icon">
        <img src={icon} alt={title} />
      </div>
      <h3 className="card-title">{title}</h3>
    </div>
  );
}

export default FeatureCard;
