"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./IdeathonSubmission.module.css";
import {
  FiArrowUpRight,
  FiAlertTriangle,
  FiChevronDown,
  FiCheck,
  FiChevronUp,
  FiUploadCloud,
  FiFileText,
  FiX,
} from "react-icons/fi";
import * as Select from "@radix-ui/react-select";
import {
  FindTeamResult,
  TeamMembersDetails,
  findTeamByName,
  fetchTeamMembers,
  updateTeamMembers,
  submitIdea,
  uploadPdfToDrive,
} from "./services/api";

const GENDER_OPTIONS = ["Male", "Female", "Other"];

interface LocalSubmissionRecord {
  teamId: string;
  teamName: string;
  submissionUrl: string;
  timestamp: number;
}

export default function SubmissionForm() {
  const [inputTeamName, setInputTeamName] = useState("");
  const [verifiedTeam, setVerifiedTeam] = useState<FindTeamResult | null>(null);
  const [isVerifyingTeam, setIsVerifyingTeam] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const [teamMembersDetails, setTeamMembersDetails] =
    useState<TeamMembersDetails | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [leaderGender, setLeaderGender] = useState("");
  const [memberGenders, setMemberGenders] = useState<Record<string, string>>(
    {},
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDriveUrl, setUploadedDriveUrl] = useState<string>("");
  const [fileError, setFileError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");

  const [formError, setFormError] = useState("");
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAlreadySubmitted = Boolean(verifiedTeam?.has_submission);

  useEffect(() => {
    if (submitStatus === "success") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [submitStatus]);

  const handleVerifyTeam = async (): Promise<void> => {
    const targetName = inputTeamName.trim();
    if (!targetName) {
      setVerifyError("Please enter your team name.");
      return;
    }

    setVerifyError("");
    setIsVerifyingTeam(true);
    setTeamMembersDetails(null);
    setLeaderGender("");
    setMemberGenders({});
    setUploadedDriveUrl("");

    try {
      const team = await findTeamByName(targetName);

      setVerifiedTeam(team);
      setIsVerifyingTeam(false);

      setIsLoadingMembers(true);
      if (team.has_submission) {
        setIsLoadingMembers(false);
        return;
      }
      const membersData = await fetchTeamMembers(team.team_id);
      setTeamMembersDetails(membersData);
      setIsLoadingMembers(false);

      return;
    } catch (err: any) {
      setVerifiedTeam(null);
      setVerifyError(err.message || "Team not found.");
      setIsVerifyingTeam(false);
    }
  };

  const handleMemberGenderChange = (userId: string, gender: string) => {
    setMemberGenders((prev) => ({
      ...prev,
      [userId]: gender,
    }));
  };

  const validateAndSetFile = (file: File) => {
    setFileError("");
    setUploadedDriveUrl("");
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setFileError("Only PDF files are allowed. Please select a .pdf file.");
      return false;
    }
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError("File size exceeds 15MB. Please select a smaller PDF.");
      return false;
    }

    setSelectedFile(file);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadedDriveUrl("");
    setFileError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setFileError("");

    const deadline = new Date("2026-08-26T23:59:59");
    if (new Date() > deadline) {
      return setFormError(
        "Submissions are closed as the deadline (26th August 2026) has passed.",
      );
    }

    const currentTeam = verifiedTeam;

    if (!currentTeam) {
      return setFormError("Please enter and verify a registered team name.");
    }

    if (isAlreadySubmitted) return;

    if (!leaderGender) {
      return setFormError(
        `Please select gender for team leader${
          teamMembersDetails?.leader_name
            ? ` (${teamMembersDetails.leader_name})`
            : ""
        }.`,
      );
    }

    if (teamMembersDetails?.members) {
      for (const member of teamMembersDetails.members) {
        if (!memberGenders[member.user_id]) {
          return setFormError(
            `Please select gender for team member (${member.name}).`,
          );
        }
      }
    }

    let finalSubmissionUrl = uploadedDriveUrl;

    if (!selectedFile && !finalSubmissionUrl) {
      setFileError("Please select or drop a PDF file to upload.");
      return setFormError("Please upload your Pitch Deck PDF.");
    }

    setSubmitStatus("submitting");

    try {
      setUploadProgressMsg("Updating team member details...");
      const membersPayload =
        teamMembersDetails?.members.map((m) => ({
          user_id: m.user_id,
          gender: memberGenders[m.user_id] || "",
        })) || [];

      await updateTeamMembers(currentTeam.team_id, {
        leader_gender: leaderGender,
        members: membersPayload,
      });

      if (selectedFile && !finalSubmissionUrl) {
        setUploadProgressMsg("Uploading PDF to Google Drive...");
        finalSubmissionUrl = await uploadPdfToDrive(
          selectedFile,
          currentTeam.team_name,
        );
        setUploadedDriveUrl(finalSubmissionUrl);
      }

      setUploadProgressMsg("Finalizing submission...");
      await submitIdea(currentTeam.team_id, finalSubmissionUrl);

      if (verifiedTeam) {
        setVerifiedTeam({
          ...verifiedTeam,
          has_submission: true,
        });
      }

      setSubmitStatus("success");
    } catch (err: any) {
      console.error("[handleSubmit] Submission error:", err);
      setSubmitStatus("error");
      setUploadProgressMsg("");
      setFormError(
        err.message || "An unexpected error occurred during submission.",
      );
    }
  };

  if (submitStatus === "success") {
    return (
      <div className={styles.successScreen}>
        <div className={styles.successIconWrapper}>
          <FiCheck className={styles.successCheck} />
        </div>
        <h2 className={styles.successTitle}>SUBMISSION SUCCESSFUL!</h2>
        <p className={styles.successDescription}>
          Thank you! Your submission for team{" "}
          <strong>{verifiedTeam?.team_name}</strong> has been received and saved
          to Google Drive. Our panel will evaluate the ideas and contact your
          team leader if any clarifications are needed.
        </p>
      </div>
    );
  }

  return (
    <>
      {submitStatus === "error" && formError && (
        <div className={`${styles.toast} ${styles.toastError}`}>
          <span>{formError}</span>
          <button
            className={styles.toastClose}
            onClick={() => {
              setSubmitStatus("idle");
              setFormError("");
            }}
            type="button"
          >
            <FiX />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNum}>01</span>
          <h2 className={styles.sectionTitle}>Find Registered Team</h2>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Team Name</label>
          <div className={styles.teamSearchBox}>
            <input
              type="text"
              placeholder="Enter your team name"
              className={styles.input}
              value={inputTeamName}
              onChange={(e) => {
                setInputTeamName(e.target.value);
                setVerifyError("");
                if (verifiedTeam) {
                  setVerifiedTeam(null);
                  setTeamMembersDetails(null);
                  setLeaderGender("");
                  setMemberGenders({});
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleVerifyTeam();
                }
              }}
              disabled={submitStatus === "submitting" || isVerifyingTeam}
            />
            <button
              type="button"
              className={`${styles.verifyBtn} ${
                verifiedTeam
                  ? isAlreadySubmitted
                    ? styles.alreadySubmittedBtn
                    : styles.verifiedBtn
                  : ""
              }`}
              onClick={handleVerifyTeam}
              disabled={
                !inputTeamName.trim() ||
                isVerifyingTeam ||
                Boolean(verifiedTeam)
              }
            >
              {isVerifyingTeam ? (
                "Verifying..."
              ) : verifiedTeam ? (
                isAlreadySubmitted ? (
                  <>
                    <span>Submitted</span>
                    <FiAlertTriangle />
                  </>
                ) : (
                  <>
                    <span>Verified</span>
                    <FiCheck />
                  </>
                )
              ) : (
                "Verify Team"
              )}
            </button>
          </div>
          {verifyError && <p className={styles.formErrorText}>{verifyError}</p>}
          {verifiedTeam && (
            <>
              {isAlreadySubmitted ? (
                <div className={styles.alreadySubmittedBox}>
                  <div className={styles.alreadySubmittedHeader}>
                    <FiAlertTriangle className={styles.warningIcon} />
                    <strong>SUBMISSION ALREADY RECEIVED</strong>
                  </div>
                  <p className={styles.alreadySubmittedText}>
                    Team <strong>{verifiedTeam.team_name}</strong> has already
                    submitted their pitch deck.
                  </p>
                </div>
              ) : (
                <div className={styles.verifiedBadge}>
                  <FiCheck className={styles.verifiedIcon} />
                  <span>
                    Team verified: <strong>{verifiedTeam.team_name}</strong>
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {Boolean(verifiedTeam) && !isAlreadySubmitted && (
          <>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>02</span>
              <h2 className={styles.sectionTitle}>Update Team Genders</h2>
            </div>

            {isLoadingMembers ? (
              <div className={styles.membersLoadingBox}>
                <div
                  className={styles.skeletonText}
                  style={{ width: "60%", height: "1.1rem" }}
                />
                <div
                  className={styles.skeletonText}
                  style={{
                    width: "100%",
                    height: "2.5rem",
                    marginTop: "0.5rem",
                  }}
                />
              </div>
            ) : (
              <div className={styles.genderSection}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Leader Gender:{" "}
                    <span className={styles.memberNameHighlight}>
                      {teamMembersDetails?.leader_name
                        ? `(${teamMembersDetails.leader_name})`
                        : ""}
                    </span>
                  </label>
                  <Select.Root
                    value={leaderGender}
                    onValueChange={setLeaderGender}
                    disabled={submitStatus === "submitting"}
                  >
                    <Select.Trigger
                      className={styles.selectTrigger}
                      aria-label="Leader Gender"
                    >
                      <Select.Value placeholder="-- Select Gender --" />
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
                          {GENDER_OPTIONS.map((opt) => (
                            <Select.Item
                              key={opt}
                              value={opt}
                              className={styles.selectItem}
                            >
                              <Select.ItemText>{opt}</Select.ItemText>
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

                {teamMembersDetails?.members &&
                  teamMembersDetails.members.map((member) => (
                    <div key={member.user_id} className={styles.field}>
                      <label className={styles.label}>
                        Member Gender:{" "}
                        <span className={styles.memberNameHighlight}>
                          ({member.name})
                        </span>
                      </label>
                      <Select.Root
                        value={memberGenders[member.user_id] || ""}
                        onValueChange={(val) =>
                          handleMemberGenderChange(member.user_id, val)
                        }
                        disabled={submitStatus === "submitting"}
                      >
                        <Select.Trigger
                          className={styles.selectTrigger}
                          aria-label={`Gender for ${member.name}`}
                        >
                          <Select.Value placeholder="-- Select Gender --" />
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
                              {GENDER_OPTIONS.map((opt) => (
                                <Select.Item
                                  key={opt}
                                  value={opt}
                                  className={styles.selectItem}
                                >
                                  <Select.ItemText>{opt}</Select.ItemText>
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
                  ))}
              </div>
            )}

            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>03</span>
              <h2 className={styles.sectionTitle}>Submission Pitch Deck</h2>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Pitch Deck (PDF Format)</label>

              {!selectedFile ? (
                <div
                  className={`${styles.dropZone} ${
                    dragActive ? styles.dropZoneActive : ""
                  } ${!verifiedTeam ? styles.dropZoneDisabled : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => verifiedTeam && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className={styles.fileInput}
                    onChange={handleFileChange}
                    disabled={submitStatus === "submitting" || !verifiedTeam}
                  />
                  <FiUploadCloud className={styles.uploadIcon} />
                  <div className={styles.dropZoneText}>
                    <p className={styles.dropZonePrimaryText}>
                      Click to browse or drag & drop your PDF file here
                    </p>
                    <p className={styles.dropZoneSubText}>
                      Supports PDF format • Max 15MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className={styles.fileCard}>
                  <div className={styles.fileIconWrapper}>
                    <FiFileText className={styles.fileCardIcon} />
                  </div>
                  <div className={styles.fileDetails}>
                    <p className={styles.fileCardName}>{selectedFile.name}</p>

                    <p className={styles.fileCardSize}>
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.removeFileBtn}
                    onClick={removeFile}
                    disabled={submitStatus === "submitting"}
                    title="Remove file"
                  >
                    <FiX />
                  </button>
                </div>
              )}

              {fileError && <p className={styles.formErrorText}>{fileError}</p>}
            </div>

            {formError && submitStatus !== "error" && (
              <p className={styles.formErrorText}>{formError}</p>
            )}

            <button
              type="submit"
              disabled={
                submitStatus === "submitting" ||
                !verifiedTeam ||
                (!selectedFile && !uploadedDriveUrl)
              }
              className={styles.submitBtn}
            >
              {submitStatus === "submitting" ? (
                <span>{uploadProgressMsg || "Submitting..."}</span>
              ) : (
                <>
                  <span>Submit Idea</span>
                  <FiArrowUpRight />
                </>
              )}
            </button>
          </>
        )}
      </form>
    </>
  );
}
