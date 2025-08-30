import { useState } from "react"
import Login from "./Login";
import Register from './Register';

interface AuthContainerProps {
  route: string;
  onClose: () => void;
}

export default function AuthContainer({ route, onClose }: AuthContainerProps){
  const [page, setPage] = useState(route);
  
  return(
    <div className="glass-card fixed inset-0 z-20 bg-[rgba(230,228,228,0.15)] backdrop-blur-[3px] flex items-center justify-center pointer-events-auto">
      {
        page === 'register' ?
        <Register setPage={setPage} onClose={onClose} />
        :
        <Login setPage={setPage} onClose={onClose}/>
      }
    </div>
  )
}