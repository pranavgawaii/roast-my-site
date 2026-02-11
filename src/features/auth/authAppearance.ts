export const clerkAppearance = {
  variables: {
    colorPrimary: "#ff3b3b",
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
      "!h-12 !rounded-xl !border !border-zinc-600 !bg-zinc-900/86 !px-4 !text-zinc-100 placeholder:!text-zinc-500 focus:!border-[#ff3b3b] focus:!ring-2 focus:!ring-[#ff3b3b]/25",
    formButtonPrimary:
      "!mt-1 !h-12 !rounded-xl !bg-[#ff3b3b] hover:!bg-[#ff5252] !text-black !font-bold !shadow-[0_10px_24px_rgba(255,59,59,0.28)]",
    formFieldSuccessText: "!text-zinc-300",
    formFieldErrorText: "!text-red-300",
    otpCodeFieldInput:
      "!h-12 !rounded-xl !border !border-zinc-600 !bg-zinc-900/86 !text-zinc-100",
    alert: "!rounded-xl !border !border-zinc-700 !bg-zinc-900/80",
    alertText: "!text-zinc-200",
    identityPreviewText: "!text-zinc-300",
    identityPreviewEditButton: "!text-[#ff8f8f] hover:!text-[#ffd0d0]",
    formResendCodeLink: "!text-[#ff8f8f] hover:!text-[#ffd0d0]",
    footer: "!hidden",
    footerAction: "!hidden",
    footerActionText: "!hidden",
    footerActionLink: "!hidden",
    footerPages: "!hidden",
    footerPagesLink: "!hidden"
  }
};
