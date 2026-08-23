"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import EventRegistrationForm from "../components/EventRegistrationForm";
import styles from "./ideathon.module.css";
import { formater } from "./services/dateFormater";

const DEFAULT_DEADLINE = "2026-08-20T20:59:59";

export default function IdeathonPage({
  closed,
  deadline = DEFAULT_DEADLINE,
}: {
  closed: boolean;
  deadline?: string;
}) {
  const [isClosed, setIsClosed] = useState(closed);

  const date = formater(deadline);

  useEffect(() => {
    if(!closed) setIsClosed(new Date() > new Date(deadline));
  }, []);

  return (
    <>
      <Navbar isMenuShown={false} />
      <main className={styles.ideathonPage}>
        <EventRegistrationForm
          title="IDEATHON"
          subtitle="Turn your ideas into impact. Register now for IDEATHON '26 and showcase your innovation on a state-level platform."
          pocs={[
            { name: "Aiswarya", phone: "+91 95391 62654" },
            { name: "Blessy", phone: "+91 77368 59869" },
            { name: "Christo", phone: "+91 95269 28521" },
          ]}
          leaderLabel="Team Leader Details"
          apiBaseUrl={process.env.NEXT_PUBLIC_IDEATHON_API_URL!}
          maxTeammates={3}
          minTeammates={1}
          requiresPayment={true}
          paymentConfig={{
            upiId: "shaheemek890@okaxis",
            qrCodeSrc: "/qr/shaheem_qr.webp",
            feeLabel: "₹200/Team",
          }}
          guidelines={
            <>
              <li>
                The competition consists of{" "}
                <strong>two rounds: Preliminary Round and Final Round.</strong>
              </li>
              <li>
                The <strong>Preliminary Round will be conducted online</strong>.
                Teams are free to choose their own theme or idea and must submit
                their pitch in the prescribed format (to be shared later).
              </li>
              <li>
                Based on the evaluation of submissions,{" "}
                <strong>
                  only selected teams will qualify for the Final Round.
                </strong>
              </li>
              <li>
                If a team is not selected for the Final Round,
                <strong> the registration fee will be refunded.</strong>
              </li>
              <li>
                The{" "}
                <strong>
                  Final Round will be held on 6th September 2026 at College of
                  Engineering Chengannur (CEC).
                </strong>
              </li>
              <li>
                Registration will be considered confirmed upon successful
                submission and payment of the participation fee.
              </li>
              <li>
                Teams are allowed to{" "}
                <strong>
                  refine or improve their idea after the Preliminary Round
                </strong>{" "}
                if they develop a better concept.
              </li>
              <li>
                Registration Deadline: <strong>{date}</strong>
              </li>
              <li>
                Further details regarding selection and final round
                participation will be communicated to shortlisted teams.
              </li>
            </>
          }
          guidelinesCheckboxLabel="competition guidelines"
          registerEndpoint="/register"
          uploadEndpoint="/upload"
          successTitle="REGISTRATION SUCCESSFUL!"
          successDescription="Your registration for the Ideathon has been recorded. Please join the official WhatsApp group to get all upcoming notifications, guidelines, and event announcements."
          whatsappGroupUrl="https://chat.whatsapp.com/JGQikpijfYf9MBUBK1n66m?mode=gi_t"
          resetButtonLabel="Register Another Team"
          isClosed={isClosed}
          closedTitle="REGISTRATION CLOSED"
          closedMessage="The registration deadline for the Ideathon has passed. We are no longer accepting submissions."
        />
      </main>
      <Footer />
    </>
  );
}
