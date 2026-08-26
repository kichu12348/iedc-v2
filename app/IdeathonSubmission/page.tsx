"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./IdeathonSubmission.module.css";
import SubmissionForm from "./SubmissionForm";

export default function IdeathonSubmissionPage() {
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const deadline = new Date("2026-08-26T23:59:59");
    setIsClosed(new Date() > deadline);
  }, []);

  return (
    <>
      <Navbar isMenuShown={false} mainUrl={"/"} />
      <main className={styles.ideathonPage}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.header}>
              <h1 className={styles.title}>Ideathon Submission</h1>
              <p className={styles.subtitle}>
                Select your registered team and upload your pitch deck PDF
                below.
              </p>
            </div>

            {isClosed ? (
              <div className={styles.closedScreen}>
                <div className={styles.closedIconWrapper}>
                  <span className={styles.closedCross}>✕</span>
                </div>
                <h2 className={styles.successTitle}>SUBMISSIONS CLOSED</h2>
                <p className={styles.successDescription}>
                  The submission deadline for the Ideathon pitch deck has
                  passed. We are no longer accepting submissions.
                </p>
              </div>
            ) : (
              <SubmissionForm />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
