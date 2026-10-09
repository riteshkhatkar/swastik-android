import React from "react";
import "./SimpleFooter.css";

const SimpleFooter = () => {
    return (
        <footer className="simple-footer">
            <div className="footer-content">
                <p className="copyright">
                    © {new Date().getFullYear()} Swastik Hospital. All rights reserved. | Developed and managed by ORELSE Private Limited.
                </p>
            </div>
        </footer>
    );
};

export default SimpleFooter;
