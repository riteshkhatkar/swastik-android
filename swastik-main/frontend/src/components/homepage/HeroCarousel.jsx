import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./HeroCarousel.css";

import slide1 from "../../assets/slide1.png";
import slide2 from "../../assets/slide2.png";
import slide3 from "../../assets/slide3.png";

const slides = [
    {
        image: slide1,
        title: "Compassionate Mental Health Care",
        subtitle: "Modern facilities and expert psychiatric support for your well-being.",
        primaryCTA: "Book Appointment",
        primaryLink: "/patient-portal/appointments",
        secondaryCTA: "Patient Portal",
        secondaryLink: "/patient-portal"
    },
    {
        image: slide2,
        title: "Personalized Treatment Plans",
        subtitle: "Tailored therapy and medical management for lasting recovery.",
        primaryCTA: "Our Services",
        primaryLink: "#services",
        secondaryCTA: "Meet Our Doctors",
        secondaryLink: "#doctors"
    },
    {
        image: slide3,
        title: "A Safe Space for Healing",
        subtitle: "Providing a calm and supportive environment for every patient.",
        primaryCTA: "Contact Us",
        primaryLink: "#contact",
        secondaryCTA: "Learn More",
        secondaryLink: "#about"
    }
];

const HeroCarousel = () => {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    const nextSlide = () => setCurrentSlide((currentSlide + 1) % slides.length);
    const prevSlide = () => setCurrentSlide((currentSlide - 1 + slides.length) % slides.length);

    return (
        <div className="hero-carousel" id="hero">
            {slides.map((slide, index) => (
                <div
                    key={index}
                    className={`hero-carousel__slide ${index === currentSlide ? "hero-carousel__slide--active" : ""}`}
                >
                    <div
                        className="hero-carousel__image"
                        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${slide.image})` }}
                    />
                    <div className="hero-carousel__content">
                        <h1 className="hero-carousel__title">{slide.title}</h1>
                        <p className="hero-carousel__subtitle">{slide.subtitle}</p>
                        <div className="hero-carousel__actions">
                            <Link to={slide.primaryLink} className="hero-carousel__btn hero-carousel__btn--primary">
                                {slide.primaryCTA}
                            </Link>
                            <Link to={slide.secondaryLink} className="hero-carousel__btn hero-carousel__btn--secondary">
                                {slide.secondaryCTA}
                            </Link>
                        </div>
                    </div>
                </div>
            ))}

            <div className="hero-carousel__controls">
                <button className="hero-carousel__control" onClick={prevSlide}>&larr;</button>
                <button className="hero-carousel__control" onClick={nextSlide}>&rarr;</button>
            </div>

            <div className="hero-carousel__indicators">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        className={`hero-carousel__indicator ${index === currentSlide ? "hero-carousel__indicator--active" : ""}`}
                        onClick={() => setCurrentSlide(index)}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroCarousel;
