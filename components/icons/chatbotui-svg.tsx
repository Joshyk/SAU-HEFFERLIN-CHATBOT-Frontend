import Image from "next/image"
import { FC } from "react"

interface ChatbotUISVGProps {
  theme: "dark" | "light"
  scale?: number
}

export const ChatbotUISVG: FC<ChatbotUISVGProps> = ({ scale = 1 }) => {
  const baseHeight = 194
  const baseWidth = (4961 / 3508) * baseHeight

  return (
    <Image
      src="/hana_ai_log.svg"
      alt="Hana AI logo"
      width={baseWidth * scale}
      height={baseHeight * scale}
      priority
    />
  )
}
