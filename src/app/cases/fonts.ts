import { DM_Sans, STIX_Two_Text } from "next/font/google";

/** Wireframe type: DM Sans for UI, STIX Two Text for page titles. Shared by A1 and A2. */
export const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-dm-sans" });
export const stix = STIX_Two_Text({ subsets: ["latin"], weight: ["600"], variable: "--font-stix" });
