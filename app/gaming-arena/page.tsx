"use client";

import { useState, useCallback, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./gaming-arena.module.css";
import { FaWhatsapp } from "react-icons/fa";
import {
  FiArrowUpRight,
  FiUpload,
  FiTrash2,
  FiPlus,
  FiCopy,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import * as Select from "@radix-ui/react-select";

import type { Teammate, TicketData, GameType, SubmitStatus } from "./types";
import {
  MAX_MINI_MILITIA_PLAYERS,
  MINI_MILITIA_CAP,
  EFOOTBALL_CAP,
  PRICE_PER_HEAD,
  GENDER_OPTIONS,
  UPI_IDS,
  QR_CODES,
  WHATSAPP_GROUPS,
  GAME_DISPLAY_NAMES,
} from "./constants";
import {
  isValidPhone,
  isValidEmail,
  sanitizePhone,
  emptyTeammate,
} from "./utils";
import {
  uploadPaymentScreenshot,
  registerTeam,
} from "./services/gamingArenaService";

const isMiniMilitiaClosed = true;
const isEFootballClosed = true;
const isAllClosed = true;

export default function GamingArenaPage() {
  const [selectedGame, setSelectedGame] = useState<GameType>("mini_militia");

  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderPhone, setLeaderPhone] = useState("");
  const [leaderGender, setLeaderGender] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [leaderCollege, setLeaderCollege] = useState("");

  const [teammates, setTeammates] = useState<Teammate[]>([]);

  const [paymentScreenshotFile, setPaymentScreenshotFile] =
    useState<File | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [copied, setCopied] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);

  const [formError, setFormError] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [ticketData, setTicketData] = useState<TicketData | null>(null);

  useEffect(() => {
    if (submitStatus === "success" || submitStatus === "error") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [submitStatus]);

  const currentHeadCount =
    selectedGame === "efootball" ? 1 : 1 + teammates.length;
  const totalAmount = currentHeadCount * PRICE_PER_HEAD;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_IDS[selectedGame]);
    setCopied(true);
    setShowCopyToast(true);
    setTimeout(() => {
      setCopied(false);
      setShowCopyToast(false);
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError("Screenshot file size should be less than 5MB.");
        return;
      }
      setScreenshotFileName(file.name);
      setPaymentScreenshotFile(file);
      setFormError("");
    }
  };

  const addTeammate = () => {
    if (1 + teammates.length < MAX_MINI_MILITIA_PLAYERS) {
      setTeammates((prev) => [...prev, emptyTeammate()]);
    }
  };

  const removeTeammate = (index: number) => {
    setTeammates((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTeammate = useCallback(
    (index: number, field: keyof Teammate, value: string) => {
      setTeammates((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], [field]: value };
        return copy;
      });
    },
    [],
  );

  const resetFormFields = () => {
    setTeamName("");
    setLeaderName("");
    setLeaderPhone("");
    setLeaderGender("");
    setLeaderEmail("");
    setLeaderCollege("");
    setTeammates([]);
    setPaymentScreenshotFile(null);
    setScreenshotFileName("");
    setUpiId("");
    setReferralCode("");
  };

  const validateForm = (): string | null => {
    if (selectedGame === "mini_militia" && isMiniMilitiaClosed) {
      return `Registration for Mini Militia is closed (Limit of ${MINI_MILITIA_CAP} reached).`;
    }
    if (selectedGame === "efootball" && isEFootballClosed) {
      return `Registration for eFootball is closed (Limit of ${EFOOTBALL_CAP} reached).`;
    }
    if (selectedGame === "mini_militia" && !teamName.trim()) {
      return "Team name is required for Mini Militia.";
    }
    if (!leaderName.trim()) {
      return selectedGame === "mini_militia"
        ? "Team Leader's name is required."
        : "Participant's name is required.";
    }
    if (!leaderPhone.trim() || !isValidPhone(leaderPhone)) {
      return "Enter a valid 10-digit phone number.";
    }
    if (!leaderGender) {
      return "Please select a gender.";
    }
    if (!leaderEmail.trim() || !isValidEmail(leaderEmail)) {
      return "Enter a valid email address.";
    }
    if (!leaderCollege.trim()) {
      return "College name is required.";
    }
    if (selectedGame === "mini_militia") {
      for (let i = 0; i < teammates.length; i++) {
        const mate = teammates[i];
        if (!mate.name.trim()) return `Teammate ${i + 1}'s name is required.`;
        if (!mate.phone.trim() || !isValidPhone(mate.phone))
          return `Enter a valid 10-digit phone number for Teammate ${i + 1}.`;
        if (!mate.gender) return `Select gender for Teammate ${i + 1}.`;
        if (!mate.email.trim() || !isValidEmail(mate.email))
          return `Enter a valid email address for Teammate ${i + 1}.`;
        if (!mate.college.trim())
          return `Teammate ${i + 1}'s college is required.`;
      }
    }
    if (!agreeTerms) {
      return "Please accept the gaming guidelines to continue.";
    }
    if (!paymentScreenshotFile) {
      return "Please upload a screenshot of payment.";
    }
    if (!upiId.trim()) {
      return "UPI ID / Transaction reference is required.";
    }
    return null;
  };

  const handleSubmitClick = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setSubmitStatus("idle");
    setSubmitMessage("");

    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    handleFinalSubmit();
  };

  const handleFinalSubmit = async () => {
    setSubmitStatus("submitting");

    const gameNameFormatted = GAME_DISPLAY_NAMES[selectedGame];
    const formattedTeamName =
      selectedGame === "mini_militia"
        ? teamName.trim()
        : teamName.trim() || leaderName.trim();

    try {
      const screenshotKey = await uploadPaymentScreenshot(
        paymentScreenshotFile!,
      );

      const payload = {
        game: gameNameFormatted,
        teamName: formattedTeamName,
        leader: {
          name: leaderName.trim(),
          phone: "+91" + leaderPhone.trim(),
          gender: leaderGender.toLowerCase(),
          email: leaderEmail.trim(),
          college: leaderCollege.trim(),
        },
        teammates:
          selectedGame === "mini_militia"
            ? teammates.map((t) => ({
                name: t.name.trim(),
                phone: "+91" + t.phone.trim(),
                gender: t.gender.toLowerCase(),
                email: t.email.trim(),
                college: t.college.trim(),
              }))
            : [],
        paymentScreenshot: screenshotKey,
        upiId: upiId.trim(),
        referralCode: referralCode.trim() || null,
        totalPaid: totalAmount,
        isEarlyBird: false,
      };

      const ticket = await registerTeam(payload);

      setTicketData(ticket);
      setSubmitStatus("success");
      setSubmitMessage(ticket.message);
      resetFormFields();
    } catch (err: any) {
      console.error("Gaming Arena registration error:", err);
      setSubmitStatus("error");
      setSubmitMessage(
        err?.message || "An unexpected error occurred. Please try again.",
      );
    }
  };

  return (
    <>
      <Navbar isMenuShown={false} />
      <main className={styles.gamingArenaPage}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.header}>
              <h1 className={styles.title}>GAMING ARENA</h1>
              <p className={styles.subtitle}>
                Unleash your gaming prowess! Compete in Mini Militia (Team Game)
                or eFootball (Individual) and conquer the battlefield.
              </p>
            </div>

            {submitStatus === "error" && (
              <div className={`${styles.toast} ${styles.toastError}`}>
                <span>{submitMessage}</span>
                <button
                  className={styles.toastClose}
                  onClick={() => setSubmitStatus("idle")}
                  type="button"
                >
                  ✕
                </button>
              </div>
            )}

            {isAllClosed ? (
              <div className={styles.closedScreen}>
                <div className={styles.closedIconWrapper}>
                  <span className={styles.closedCross}>✕</span>
                </div>
                <h2 className={styles.successTitle}>REGISTRATIONS CLOSED</h2>
                <p className={styles.successDescription}>
                  Registrations for Gaming Arena are officially closed. Thank
                  you for your overwhelming response! Stay tuned for tournament
                  updates and match schedules.
                </p>
              </div>
            ) : submitStatus === "success" && ticketData ? (
              <div className={styles.successScreen}>
                <div className={styles.successIconWrapper}>
                  <span className={styles.successCheck}>✓</span>
                </div>
                <h2 className={styles.successTitle}>
                  REGISTRATION SUCCESSFUL!
                </h2>
                <p className={styles.successDescription}>
                  You&apos;re all set! Join the WhatsApp group to stay updated
                  on match schedules, rules, and announcements.
                </p>

                <div className={styles.successActionsContainer}>
                  <a
                    href={
                      ticketData.game === GAME_DISPLAY_NAMES.mini_militia
                        ? WHATSAPP_GROUPS.mini_militia
                        : WHATSAPP_GROUPS.efootball
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.whatsappBtn}
                  >
                    <FaWhatsapp />
                    <span>Join WhatsApp Group</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitStatus("idle");
                    setTicketData(null);
                  }}
                  className={styles.resetBtn}
                >
                  Register Another Player / Team
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitClick} className={styles.form}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionNum}>01</span>
                  <h2 className={styles.sectionTitle}>Select Your Game</h2>
                </div>

                <div className={styles.gameSelectGrid}>
                  <div
                    className={`${styles.gameCard} ${
                      selectedGame === "mini_militia"
                        ? styles.gameCardSelected
                        : ""
                    } ${isMiniMilitiaClosed ? styles.gameCardDisabled : ""}`}
                    onClick={() => {
                      if (!isMiniMilitiaClosed) setSelectedGame("mini_militia");
                    }}
                  >
                    <span className={styles.gameCardBadge}>Team Event</span>
                    <h3 className={styles.gameCardTitle}>Mini Militia</h3>
                    <div className={styles.gameCardDetails}>
                      <span className={styles.gameCardType}>
                        Squad Battle (Up to 6 Players)
                      </span>
                    </div>
                  </div>

                  <div
                    className={`${styles.gameCard} ${
                      selectedGame === "efootball"
                        ? styles.gameCardSelected
                        : ""
                    } ${isEFootballClosed ? styles.gameCardDisabled : ""}`}
                    onClick={() => {
                      if (!isEFootballClosed) setSelectedGame("efootball");
                    }}
                  >
                    <span className={styles.gameCardBadge}>Solo Event</span>
                    <h3 className={styles.gameCardTitle}>eFootball</h3>
                    <div className={styles.gameCardDetails}>
                      <span className={styles.gameCardType}>
                        Individual Tournament
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.sectionHeader}>
                  <span className={styles.sectionNum}>02</span>
                  <h2 className={styles.sectionTitle}>
                    {selectedGame === "mini_militia"
                      ? "Team & Leader Details"
                      : "Participant Details"}
                  </h2>
                </div>

                {selectedGame === "mini_militia" && (
                  <div className={styles.field}>
                    <label className={styles.label}>Team Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Predators"
                      className={styles.input}
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      {selectedGame === "mini_militia"
                        ? "Leader Name"
                        : "Full Name"}
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className={styles.input}
                      value={leaderName}
                      onChange={(e) => setLeaderName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Gender</label>
                    <Select.Root
                      value={leaderGender}
                      onValueChange={setLeaderGender}
                    >
                      <Select.Trigger
                        className={styles.selectTrigger}
                        aria-label="Leader Gender"
                      >
                        <Select.Value placeholder="Select Gender" />
                        <Select.Icon className={styles.selectIcon}>
                          <FiChevronDown />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className={styles.selectContent}
                          position="popper"
                          sideOffset={4}
                        >
                          <Select.ScrollUpButton
                            className={styles.selectScrollButton}
                          >
                            <FiChevronUp />
                          </Select.ScrollUpButton>
                          <Select.Viewport className={styles.selectViewport}>
                            {GENDER_OPTIONS.map((g) => (
                              <Select.Item
                                key={g}
                                value={g}
                                className={styles.selectItem}
                              >
                                <Select.ItemText>{g}</Select.ItemText>
                                <Select.ItemIndicator
                                  className={styles.selectItemIndicator}
                                >
                                  <FiCheck />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                          <Select.ScrollDownButton
                            className={styles.selectScrollButton}
                          >
                            <FiChevronDown />
                          </Select.ScrollDownButton>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>Phone Number</label>
                    <div className={styles.phoneInputWrap}>
                      <span className={styles.phonePrefix}>+91</span>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        className={styles.input}
                        value={leaderPhone}
                        onChange={(e) =>
                          setLeaderPhone(sanitizePhone(e.target.value))
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Email Address</label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      className={styles.input}
                      value={leaderEmail}
                      onChange={(e) => setLeaderEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>College / Institution</label>
                  <input
                    type="text"
                    placeholder="e.g. College of Engineering Chengannur"
                    className={styles.input}
                    value={leaderCollege}
                    onChange={(e) => setLeaderCollege(e.target.value)}
                    required
                  />
                </div>

                {/* 03 Teammates (Only for Mini Militia) */}
                {selectedGame === "mini_militia" && (
                  <>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionNum}>03</span>
                      <div className={styles.teammateTitleRow}>
                        <h2 className={styles.sectionTitle}>
                          Squad Teammates ({1 + teammates.length}/
                          {MAX_MINI_MILITIA_PLAYERS})
                        </h2>
                        <button
                          type="button"
                          onClick={addTeammate}
                          disabled={
                            1 + teammates.length >= MAX_MINI_MILITIA_PLAYERS
                          }
                          className={styles.addTeammateBtn}
                        >
                          <FiPlus /> Add <span>Player</span>
                        </button>
                      </div>
                    </div>

                    {teammates.length === 0 ? (
                      <div className={styles.emptyTeammates}>
                        <p>
                          No teammates added yet. Leader is Player 1. Click
                          &quot;Add Player&quot; to add up to 5 teammates (Max
                          squad size: 6).
                        </p>
                      </div>
                    ) : (
                      <div className={styles.teammateList}>
                        {teammates.map((mate, idx) => (
                          <div key={idx} className={styles.teammateCard}>
                            <div className={styles.teammateHeader}>
                              <span className={styles.teammateNum}>
                                Player {idx + 2} Details
                              </span>
                              <button
                                type="button"
                                onClick={() => removeTeammate(idx)}
                                className={styles.removeTeammateBtn}
                              >
                                <FiTrash2 /> Remove
                              </button>
                            </div>
                            <div className={styles.row}>
                              <div className={styles.field}>
                                <label className={styles.label}>
                                  Full Name
                                </label>
                                <input
                                  type="text"
                                  placeholder="Player Name"
                                  className={styles.input}
                                  value={mate.name}
                                  onChange={(e) =>
                                    updateTeammate(idx, "name", e.target.value)
                                  }
                                  required
                                />
                              </div>
                              <div className={styles.field}>
                                <label className={styles.label}>Gender</label>
                                <Select.Root
                                  value={mate.gender}
                                  onValueChange={(val) =>
                                    updateTeammate(idx, "gender", val)
                                  }
                                >
                                  <Select.Trigger
                                    className={styles.selectTrigger}
                                    aria-label={`Gender for Player ${idx + 2}`}
                                  >
                                    <Select.Value placeholder="Select Gender" />
                                    <Select.Icon className={styles.selectIcon}>
                                      <FiChevronDown />
                                    </Select.Icon>
                                  </Select.Trigger>
                                  <Select.Portal>
                                    <Select.Content
                                      className={styles.selectContent}
                                      position="popper"
                                      sideOffset={4}
                                    >
                                      <Select.ScrollUpButton
                                        className={styles.selectScrollButton}
                                      >
                                        <FiChevronUp />
                                      </Select.ScrollUpButton>
                                      <Select.Viewport
                                        className={styles.selectViewport}
                                      >
                                        {GENDER_OPTIONS.map((g) => (
                                          <Select.Item
                                            key={g}
                                            value={g}
                                            className={styles.selectItem}
                                          >
                                            <Select.ItemText>
                                              {g}
                                            </Select.ItemText>
                                            <Select.ItemIndicator
                                              className={
                                                styles.selectItemIndicator
                                              }
                                            >
                                              <FiCheck />
                                            </Select.ItemIndicator>
                                          </Select.Item>
                                        ))}
                                      </Select.Viewport>
                                      <Select.ScrollDownButton
                                        className={styles.selectScrollButton}
                                      >
                                        <FiChevronDown />
                                      </Select.ScrollDownButton>
                                    </Select.Content>
                                  </Select.Portal>
                                </Select.Root>
                              </div>
                            </div>
                            <div className={styles.row}>
                              <div className={styles.field}>
                                <label className={styles.label}>
                                  Phone Number
                                </label>
                                <div className={styles.phoneInputWrap}>
                                  <span className={styles.phonePrefix}>
                                    +91
                                  </span>
                                  <input
                                    type="tel"
                                    placeholder="9876543210"
                                    className={styles.input}
                                    value={mate.phone}
                                    onChange={(e) =>
                                      updateTeammate(
                                        idx,
                                        "phone",
                                        sanitizePhone(e.target.value),
                                      )
                                    }
                                    required
                                  />
                                </div>
                              </div>
                              <div className={styles.field}>
                                <label className={styles.label}>
                                  Email Address
                                </label>
                                <input
                                  type="email"
                                  placeholder="player@example.com"
                                  className={styles.input}
                                  value={mate.email}
                                  onChange={(e) =>
                                    updateTeammate(idx, "email", e.target.value)
                                  }
                                  required
                                />
                              </div>
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>College</label>
                              <input
                                type="text"
                                placeholder="College Name"
                                className={styles.input}
                                value={mate.college}
                                onChange={(e) =>
                                  updateTeammate(idx, "college", e.target.value)
                                }
                                required
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* 04 Competition Guidelines */}
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionNum}>
                    {selectedGame === "mini_militia" ? "04" : "03"}
                  </span>
                  <h2 className={styles.sectionTitle}>Tournament Guidelines</h2>
                </div>

                <div className={styles.guidelinesInlineBox}>
                  <ul className={styles.guidelinesInlineList}>
                    {selectedGame === "mini_militia" ? (
                      <>
                        <li>
                          <strong>Registration Fee:</strong> ₹{PRICE_PER_HEAD}{" "}
                          per head.
                        </li>
                        <li>
                          <strong>Platform:</strong> Mobile.
                        </li>
                        <li>
                          Teams must have <strong>3–6 players</strong>.
                        </li>
                        <li>
                          <strong>Tournament Mode:</strong> Played completely{" "}
                          <strong>online</strong>.
                        </li>
                        <li>
                          Teams must <strong>report on time</strong> as per the
                          schedule.
                        </li>
                        <li>
                          <strong>No changes</strong> will be made to{" "}
                          <strong>match rules based on team size</strong>. A
                          3-member team may face a 6-member team (3v6).
                        </li>
                        <li>
                          Hacks, mods, cheats, abusive behavior, or any unfair
                          practices will result in{" "}
                          <strong>immediate disqualification</strong>.
                        </li>
                        <li>
                          Players are responsible for a{" "}
                          <strong>stable internet</strong> connection during
                          online matches.
                        </li>
                        <li>
                          The organizers reserve the right to modify the
                          schedule or match settings.{" "}
                          <strong>
                            All decisions of the organizing committee are final
                          </strong>
                          .
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          <strong>Registration Fee:</strong> ₹{PRICE_PER_HEAD}{" "}
                          per participant.
                        </li>
                        <li>
                          <strong>Platform:</strong> Mobile.
                        </li>
                        <li>
                          This is an <strong>individual event</strong>.
                        </li>
                        <li>
                          <strong>Tournament Mode:</strong> Played completely{" "}
                          <strong>online</strong>.
                        </li>
                        <li>
                          Participants must <strong>report on time</strong> as
                          per the schedule.
                        </li>
                        <li>
                          The use of hacks, mods, exploits, unauthorized
                          applications, or any unfair practices will result in{" "}
                          <strong>immediate disqualification</strong>.
                        </li>
                        <li>
                          Players are responsible for ensuring a{" "}
                          <strong>stable internet connection</strong> during
                          online matches.
                        </li>
                        <li>
                          Match{" "}
                          <strong>
                            settings and rules will be announced by the
                            organizers
                          </strong>{" "}
                          before each round.
                        </li>
                        <li>
                          The organizers reserve the right to modify the
                          schedule or match settings.{" "}
                          <strong>
                            All decisions of the organizing committee are final
                          </strong>
                          .
                        </li>
                      </>
                    )}
                  </ul>

                  <div className={styles.agreeContainer}>
                    <input
                      type="checkbox"
                      id="agree-gaming-guidelines"
                      className={styles.agreeCheckbox}
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <label
                      htmlFor="agree-gaming-guidelines"
                      className={styles.agreeLabel}
                    >
                      I have read and agree to the Gaming Arena tournament
                      guidelines.
                    </label>
                  </div>
                </div>

                {/* 05 Payment Details */}
                <div
                  className={`${styles.sectionHeader} ${
                    !agreeTerms ? styles.paymentDisabled : ""
                  }`}
                >
                  <span className={styles.sectionNum}>
                    {selectedGame === "mini_militia" ? "05" : "04"}
                  </span>
                  <h2 className={styles.sectionTitle}>Payment Details</h2>
                </div>

                <div
                  className={`${styles.paymentInfoBox} ${
                    !agreeTerms ? styles.paymentDisabled : ""
                  }`}
                >
                  <p className={styles.paymentInstructions}>
                    Scan the UPI QR code or send payment to the UPI ID below to
                    confirm your slot.
                  </p>
                  <div className={styles.paymentDetailsRow}>
                    <div className={styles.qrCodeWrapper}>
                      <img
                        src={QR_CODES[selectedGame]}
                        alt={`${GAME_DISPLAY_NAMES[selectedGame]} Payment QR Code`}
                        className={styles.qrImage}
                      />
                    </div>
                    <div className={styles.payment}>
                      <div className={styles.paymentTextGroup}>
                        <span className={styles.paymentLabel}>UPI ID:</span>
                        <div className={styles.upiValueContainer}>
                          <strong className={styles.paymentValue}>
                            {UPI_IDS[selectedGame]}
                          </strong>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            disabled={!agreeTerms}
                            className={styles.copyButton}
                            title="Copy UPI ID"
                          >
                            {copied ? (
                              <FiCheck className={styles.copiedIcon} />
                            ) : (
                              <FiCopy />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className={styles.paymentTextGroup}>
                        <span className={styles.paymentLabel}>
                          Total Payable Fee:
                        </span>
                        <strong className={styles.regFee}>
                          ₹{totalAmount} ({currentHeadCount}{" "}
                          {currentHeadCount === 1 ? "Player" : "Players"} @ ₹
                          {PRICE_PER_HEAD}/head)
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`${styles.row} ${
                    !agreeTerms ? styles.paymentDisabled : ""
                  }`}
                >
                  <div className={styles.field}>
                    <label className={styles.label}>
                      UPI ID / Transaction Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. shaheem@okaxis or Ref No 321890..."
                      className={styles.input}
                      value={upiId}
                      disabled={!agreeTerms}
                      onChange={(e) => setUpiId(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Referral Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GAMING100"
                      className={styles.input}
                      value={referralCode}
                      disabled={!agreeTerms}
                      onChange={(e) => setReferralCode(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  className={`${styles.field} ${
                    !agreeTerms ? styles.paymentDisabled : ""
                  }`}
                >
                  <label className={styles.label}>Screenshot of Payment</label>
                  <div className={styles.fileUploadContainer}>
                    <input
                      type="file"
                      accept="image/*"
                      id="gaming-screenshot-upload"
                      className={styles.fileInput}
                      disabled={!agreeTerms}
                      onChange={handleFileChange}
                      required
                    />
                    <label
                      htmlFor="gaming-screenshot-upload"
                      className={`${styles.fileLabel} ${
                        !agreeTerms ? styles.fileLabelDisabled : ""
                      }`}
                    >
                      <FiUpload className={styles.uploadIcon} />
                      {screenshotFileName ? (
                        <span className={styles.fileName}>
                          {screenshotFileName}
                        </span>
                      ) : (
                        <span>Choose Screenshot (Max 5MB)</span>
                      )}
                    </label>
                  </div>
                </div>

                {formError && (
                  <p className={styles.formErrorText}>{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitStatus === "submitting" || !agreeTerms}
                  className={styles.submitBtn}
                >
                  {submitStatus === "submitting" ? (
                    "Submitting registration..."
                  ) : (
                    <>
                      <span>Submit Gaming Registration</span>
                      <FiArrowUpRight />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      {showCopyToast && (
        <div className={styles.copyToast}>
          <span>UPI ID Copied to Clipboard!</span>
        </div>
      )}
      <Footer />
    </>
  );
}
