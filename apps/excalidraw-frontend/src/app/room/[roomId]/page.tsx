import { Room } from "@/components/Room";

export default async function page({ params }: { params: {roomId: string }}) {
  const roomId = (await params).roomId;
  
  return (
    <Room roomId={roomId} />
  )
}