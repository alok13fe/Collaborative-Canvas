import { Roboto, Nunito, Chewy, Shadows_Into_Light_Two } from "next/font/google"

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  display: "swap"
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap"
});

const chewy = Chewy({
  variable: "--font-chewy",
  subsets: ["latin"],
  weight: "400",
  display: "swap"
})

const shadows = Shadows_Into_Light_Two({
  variable: "--font-shadows",
  subsets: ["latin"],
  weight: '400',
  display: "swap"
})

export const fontVariables = [
  nunito.variable,
  roboto.variable,
  chewy.variable,
  shadows.variable,
].join(' ');

export const robotoFamily = roboto.style.fontFamily;
export const nunitoFamily = nunito.style.fontFamily;
export const chewyFamily = chewy.style.fontFamily;
export const shadowsFamily = shadows.style.fontFamily;