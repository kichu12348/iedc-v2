"use client";

import { useState, useCallback } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import styles from "./brands.module.css";

interface Brand {
  name: string;
  description: string;
}

const BRANDS: Brand[] = [
  { name: "Uber", description: "On-demand transportation" },
  { name: "Airbnb", description: "Home rental" },
  { name: "Swiggy", description: "Food delivery" },
  { name: "Zomato", description: "Restaurant discovery" },
  { name: "Blinkit", description: "10-minute grocery delivery" },
  { name: "Dunzo", description: "Hyperlocal delivery" },
  { name: "Netflix", description: "Streaming" },
  { name: "Spotify", description: "Music streaming" },
  { name: "Duolingo", description: "Gamified learning" },
  { name: "Coursera", description: "Online courses" },
  { name: "Notion", description: "Workspace" },
  { name: "Canva", description: "Graphic design" },
  { name: "CRED", description: "Rewards & fintech" },
  { name: "PhonePe", description: "Digital payments" },
  { name: "Groww", description: "Investments" },
  { name: "Urban Company", description: "Home services" },
  { name: "Practo", description: "Doctor consultation" },
  { name: "Zepto", description: "Quick commerce" },
  { name: "boAt", description: "Consumer electronics" },
  { name: "Fittr", description: "Fitness coaching" },
];

function getRandomBrands(): [Brand, Brand] {
  const idx1 = Math.floor(Math.random() * BRANDS.length);
  let idx2 = Math.floor(Math.random() * (BRANDS.length - 1));
  if (idx2 >= idx1) idx2++; // ensures idx2 ≠ idx1
  return [BRANDS[idx1], BRANDS[idx2]];
}

export default function BrandsPage() {
  const [teamName, setTeamName] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [brands, setBrands] = useState<[Brand, Brand] | null>(null);

  const handleReveal = useCallback(() => {
    if (!teamName.trim()) return;
    const pair = getRandomBrands();
    setBrands(pair);
    setRevealed(true);
  }, [teamName]);

  const handleReset = useCallback(() => {
    setTeamName("");
    setRevealed(false);
    setBrands(null);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleReveal();
  };

  return (
    <>
      <Navbar isMenuShown={false} />
      <main className={styles.brandsPage}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            YOUR <span className={styles.titleAccent}>BRANDS</span>
          </h1>
          <p className={styles.subtitle}>
            Enter your team name to reveal the two startup brands assigned to
            your team. Combine their core ideas to build something new!
          </p>
        </div>

        {!revealed && (
          <div className={styles.inputSection}>
            <div className={styles.inputWrapper}>
              <input
                id="team-name-input"
                type="text"
                className={styles.teamInput}
                placeholder="Enter your team name..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                autoComplete="off"
              />
            </div>
            <button
              id="reveal-brands-btn"
              className={styles.revealBtn}
              onClick={handleReveal}
              disabled={!teamName.trim()}
            >
              Reveal Brands
            </button>
          </div>
        )}

        {revealed && brands && (
          <>
            <div className={styles.teamBadge}>
              Team: <strong>{teamName.trim()}</strong>
            </div>

            <div className={styles.cardsGrid}>
              {brands.map((brand, i) => (
                <div
                  key={brand.name}
                  className={`${styles.cardContainer} ${styles.cardEnter} ${
                    i === 1 ? styles.cardEnterDelay : ""
                  }`}
                >
                  <div className={`${styles.card} ${styles.cardFlipped}`}>
                    <div className={`${styles.cardFace} ${styles.cardFront}`}>
                      <span className={styles.cardFrontLabel}>
                        Brand {i + 1}
                      </span>
                      <span className={styles.cardNumber}>{i + 1}</span>
                    </div>

                    <div className={`${styles.cardFace} ${styles.cardBack}`}>
                      <h2 className={styles.brandName}>{brand.name}</h2>
                      <div className={styles.brandDivider} />
                      <p className={styles.brandDescription}>
                        {brand.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              id="reset-brands-btn"
              className={styles.resetBtn}
              onClick={handleReset}
            >
              ← Try Another Team
            </button>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
