export const clerkAppearance = {
  variables: {
    colorPrimary: "#ff4d22",
    colorBackground: "transparent",
    colorText: "#f4f4f5",
    colorTextSecondary: "#a1a1aa",
    colorInputText: "#f4f4f5",
    colorInputBackground: "rgba(24, 24, 27, 0.88)",
    borderRadius: "1rem",
    fontFamily: "Inter, sans-serif"
  },
  elements: {
    rootBox: "!w-full",
    cardBox: "!w-full !max-w-none",
    card: "!w-full !rounded-none !bg-transparent !border-0 !shadow-none !p-0",
    main: "!space-y-3 !p-3 md:!p-4",
    headerTitle: "!hidden",
    headerSubtitle: "!hidden",
    socialButtons: "!space-y-3",
    socialButtonsBlockButton:
      "!h-12 !rounded-xl !border !border-zinc-600 !bg-zinc-900/80 hover:!bg-zinc-800/85 !text-zinc-100",
    socialButtonsBlockButtonText: "!text-zinc-100 !text-sm !font-medium",
    dividerRow: "!my-2",
    dividerLine: "!bg-zinc-700",
    dividerText: "!text-zinc-500",
    formField: "!space-y-2",
    formFieldRow: "!gap-3",
    formFieldLabel: "!text-zinc-100 !text-sm !font-medium",
    formFieldInput:
      "!h-12 !rounded-xl !border !border-zinc-600 !bg-zinc-900/86 !px-4 !text-zinc-100 placeholder:!text-zinc-500 focus:!border-[#ff4d22] focus:!ring-2 focus:!ring-[#ff4d22]/25",
    formButtonPrimary:
      "!mt-1 !h-12 !rounded-xl !bg-[#ff4d22] hover:!bg-[#ff5a2f] !text-black !font-bold !shadow-[0_10px_24px_rgba(255,77,34,0.28)]",
    formFieldSuccessText: "!text-zinc-300",
    formFieldErrorText: "!text-red-300",
    otpCodeFieldInput:
      "!h-12 !rounded-xl !border !border-zinc-600 !bg-zinc-900/86 !text-zinc-100",
    alert: "!rounded-xl !border !border-zinc-700 !bg-zinc-900/80",
    alertText: "!text-zinc-200",
    identityPreviewText: "!text-zinc-300",
    identityPreviewEditButton: "!text-[#ff8a6e] hover:!text-[#ffd9cf]",
    formResendCodeLink: "!text-[#ff8a6e] hover:!text-[#ffd9cf]",
    footer: "!hidden",
    footerAction: "!hidden",
    footerActionText: "!hidden",
    footerActionLink: "!hidden",
    footerPages: "!hidden",
    footerPagesLink: "!hidden"
  }
};
