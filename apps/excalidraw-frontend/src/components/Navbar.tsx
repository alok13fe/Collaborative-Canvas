"use client";
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch} from '@/lib/hooks';
import { changeSelectedTool, addShape, toggleLockTool } from '@/lib/features/board/boardSlice';
import AuthContainer from './AuthContainer';
import axios from 'axios';
import { Image } from '@repo/common/shapes';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {

  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [authContainer, setAuthContainer] = useState<boolean>(false);
  const [route, setRoute] = useState<string>('login');
  const [loading, setLoading] = useState(false);
  const { profile } = useAppSelector(state => state.user);
  const { selectedTool, lockTool, totalShapes } = useAppSelector(state => state.board);
  
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>){
    const files = e.target.files;
    if(files && files.length > 0){
      const fileSize = parseInt(((files[0].size / 1024) / 1024).toFixed(4));

      if(fileSize > 5){
        console.log(`File must be atmost 5 MB long`);
        return;
      }

      const formData = new FormData();
      formData.append('image', files[0]);

      axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/user/upload-image`, formData)
      .then((response) => {
        let { width, height } = response.data.data;
        
        if(width >= 500){
          height = (height / width) * 500;
          width = 500;
        }

        if(height >= 500){
          width = (width / height) * 500;
          height = 500;
        }

        const image: Image = {
          id: totalShapes,
          type: 'image',
          startX: 50,
          startY: 50,
          width: width,
          height: height,
          url: response.data.data.url
        }

        dispatch(addShape(image));
        console.log('Image Added Successfully');
      })
      .catch((error) => {
        console.log(error);
      })
    }
  }

  async function createRoom(){
    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/room/create`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      router.push(`/room/${response.data.data.roomId}`);
    } catch (error) {
      console.log(error);
    }

    setLoading(false);
  }

  useEffect(() => {
    if(pathname.startsWith('/room') && profile === null){
      setAuthContainer(true);
    }
  },[pathname, profile]);

  return (
    <>
      <nav className='p-4 w-full fixed top-0 left-0 pointer-events-none'>
        <div className='flex justify-between items-start'>
          <button 
            className='p-2.5 bg-white hover:bg-gray-200 pointer-events-auto border-1 border-gray-200 shadow-md rounded'
            onClick={() => setMenuOpen(curr => !curr)}
            onBlur={() => setMenuOpen(false)}
          >
            <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6H20M4 12H20M4 18H20" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className='p-1 bg-white flex space-x-1 pointer-events-auto border border-gray-100 shadow-md rounded'>
            <div className='pr-1 border-r border-gray-200'>
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${lockTool ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(toggleLockTool()) }}  
              >
                {
                  lockTool ?
                  <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 14.5V16.5M7 10.0288C7.47142 10 8.05259 10 8.8 10H15.2C15.9474 10 16.5286 10 17 10.0288M7 10.0288C6.41168 10.0647 5.99429 10.1455 5.63803 10.327C5.07354 10.6146 4.6146 11.0735 4.32698 11.638C4 12.2798 4 13.1198 4 14.8V16.2C4 17.8802 4 18.7202 4.32698 19.362C4.6146 19.9265 5.07354 20.3854 5.63803 20.673C6.27976 21 7.11984 21 8.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V14.8C20 13.1198 20 12.2798 19.673 11.638C19.3854 11.0735 18.9265 10.6146 18.362 10.327C18.0057 10.1455 17.5883 10.0647 17 10.0288M7 10.0288V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V10.0288" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  :
                  <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.584 6C15.8124 4.2341 14.0503 3 12 3C9.23858 3 7 5.23858 7 8V10.0288M12 14.5V16.5M7 10.0288C7.47142 10 8.05259 10 8.8 10H15.2C16.8802 10 17.7202 10 18.362 10.327C18.9265 10.6146 19.3854 11.0735 19.673 11.638C20 12.2798 20 13.1198 20 14.8V16.2C20 17.8802 20 18.7202 19.673 19.362C19.3854 19.9265 18.9265 20.3854 18.362 20.673C17.7202 21 16.8802 21 15.2 21H8.8C7.11984 21 6.27976 21 5.63803 20.673C5.07354 20.3854 4.6146 19.9265 4.32698 19.362C4 18.7202 4 17.8802 4 16.2V14.8C4 13.1198 4 12.2798 4.32698 11.638C4.6146 11.0735 5.07354 10.6146 5.63803 10.327C5.99429 10.1455 6.41168 10.0647 7 10.0288Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
              </div>
            </div>

            <div className='flex flex-wrap space-x-1'>
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 9 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(9)) }}
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg" aria-labelledby="panIconTitle" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" color="#000000">
                  <path d="M20,14 L20,17 C20,19.209139 18.209139,21 16,21 L10.0216594,21 C8.75045497,21 7.55493392,20.3957659 6.80103128,19.3722467 L3.34541668,14.6808081 C2.81508416,13.9608139 2.94777982,12.950548 3.64605479,12.391928 C4.35756041,11.8227235 5.38335813,11.8798792 6.02722571,12.5246028 L8,14.5 L8,13 L8.00393081,13 L8,11 L8.0174523,6.5 C8.0174523,5.67157288 8.68902517,5 9.5174523,5 C10.3458794,5 11.0174523,5.67157288 11.0174523,6.5 L11.0174523,11 L11.0174523,4.5 C11.0174523,3.67157288 11.6890252,3 12.5174523,3 C13.3458794,3 14.0174523,3.67157288 14.0174523,4.5 L14.0174523,11 L14.0174523,5.5 C14.0174523,4.67157288 14.6890252,4 15.5174523,4 C16.3458794,4 17.0174523,4.67157288 17.0174523,5.5 L17.0174523,11 L17.0174523,7.5 C17.0174523,6.67157288 17.6890252,6 18.5174523,6 C19.3458794,6 20.0174523,6.67157288 20.0174523,7.5 L20.0058962,14 L20,14 Z"/> 
                </svg>
              </div>
              <div 
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 1 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(1)) }}  
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.5266 12.5324L20 20M19.0117 9.81874L12.8083 12.3731C12.6945 12.4199 12.6377 12.4434 12.5895 12.4783C12.5468 12.5093 12.5093 12.5468 12.4783 12.5895C12.4434 12.6377 12.4199 12.6945 12.3731 12.8083L9.81874 19.0117C9.56565 19.6264 9.43911 19.9337 9.2675 20.0169C9.11884 20.0889 8.94417 20.0829 8.80082 20.0008C8.63535 19.906 8.53025 19.5907 8.32005 18.9601L3.50599 4.51792C3.34314 4.02937 3.26172 3.7851 3.31964 3.62265C3.37005 3.48129 3.48129 3.37005 3.62265 3.31964C3.7851 3.26172 4.02937 3.34314 4.51792 3.50599L18.9601 8.32005C19.5907 8.53025 19.906 8.63535 20.0008 8.80082C20.0829 8.94417 20.0889 9.11884 20.0169 9.2675C19.9337 9.43911 19.6264 9.56565 19.0117 9.81874Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div 
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 2 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(2)) }}  
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div 
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 3 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(3)) }}  
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.26244 14.2628C3.47041 13.4707 3.07439 13.0747 2.92601 12.618C2.7955 12.2164 2.7955 11.7837 2.92601 11.382C3.07439 10.9253 3.47041 10.5293 4.26244 9.73727L9.73703 4.26268C10.5291 3.47065 10.9251 3.07463 11.3817 2.92626C11.7834 2.79574 12.2161 2.79574 12.6178 2.92626C13.0745 3.07463 13.4705 3.47065 14.2625 4.26268L19.7371 9.73727C20.5291 10.5293 20.9251 10.9253 21.0735 11.382C21.204 11.7837 21.204 12.2164 21.0735 12.618C20.9251 13.0747 20.5291 13.4707 19.7371 14.2628L14.2625 19.7373C13.4705 20.5294 13.0745 20.9254 12.6178 21.0738C12.2161 21.2043 11.7834 21.2043 11.3817 21.0738C10.9251 20.9254 10.5291 20.5294 9.73703 19.7373L4.26244 14.2628Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 4 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(4)) }}  
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 5 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(5)) }}  
              >
                <svg fill="#000000" width="18px" height="18px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.707,18.707a1,1,0,0,1-1.414-1.414L19.586,13H2a1,1,0,0,1,0-2H19.586L15.293,6.707a1,1,0,0,1,1.414-1.414l6,6a1,1,0,0,1,0,1.414Z"/>
                </svg>
              </div>
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 6 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(6)) }}
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 12L18 12" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 7 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(7)) }}
              >
                <svg height="16px" width="16px" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"  fill="#000000">
                  <path d="M497.209,88.393l-73.626-73.6c-19.721-19.712-51.656-19.729-71.376-0.017L304.473,62.51L71.218,295.816 c-9.671,9.662-17.066,21.341-21.695,34.193L2.238,461.6c-4.93,13.73-1.492,29.064,8.818,39.372 c10.318,10.317,25.659,13.739,39.39,8.801l131.565-47.286c12.851-4.628,24.539-12.032,34.201-21.694l220.801-220.817l0.017,0.017 l12.481-12.498l47.699-47.725l0.026-0.018C516.861,140.039,516.939,108.14,497.209,88.393z M170.064,429.26l-83.822,30.133 l-33.606-33.607l30.116-83.831c0.224-0.604,0.517-1.19,0.758-1.792l88.339,88.339C171.245,428.752,170.676,429.036,170.064,429.26z M191.242,415.831c-1.19,1.19-2.457,2.284-3.741,3.362l-94.674-94.674c1.069-1.276,2.163-2.552,3.352-3.741L327.685,89.22	l95.079,95.08L191.242,415.831z M472.247,134.808l-35.235,35.244l-1.767,1.767l-95.08-95.079l37.003-37.003	c5.921-5.896,15.506-5.905,21.454,0.017l73.625,73.609c5.921,5.904,5.93,15.489-0.026,21.47L472.247,134.808z"/>
                </svg>
              </div>
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 8 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(8)) }}
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3V21M9 21H15M19 6V3H5V6" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <label className='p-2.5 cursor-pointer hover:bg-gray-200 rounded'>
                <input 
                  type='file' 
                  accept='image/*' 
                  onChange={handleImageChange}
                  hidden
                />

                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M23 4C23 2.34315 21.6569 1 20 1H4C2.34315 1 1 2.34315 1 4V20C1 21.6569 2.34315 23 4 23H20C21.6569 23 23 21.6569 23 20V4ZM21 4C21 3.44772 20.5523 3 20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4Z" fill="#0F0F0F"/>
                  <path d="M4.80665 17.5211L9.1221 9.60947C9.50112 8.91461 10.4989 8.91461 10.8779 9.60947L14.0465 15.4186L15.1318 13.5194C15.5157 12.8476 16.4843 12.8476 16.8682 13.5194L19.1451 17.5039C19.526 18.1705 19.0446 19 18.2768 19H5.68454C4.92548 19 4.44317 18.1875 4.80665 17.5211Z" fill="#0F0F0F"/>
                  <path d="M18 8C18 9.10457 17.1046 10 16 10C14.8954 10 14 9.10457 14 8C14 6.89543 14.8954 6 16 6C17.1046 6 18 6.89543 18 8Z" fill="#0F0F0F"/>
                </svg>
              </label>
              <div 
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 0 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(0)) }}
              >
                <svg fill="#000000" height="18px" width="18px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <g>
                    <g>
                      <path d="M495.276,133.96L377.032,15.715c-19.605-19.608-51.34-19.609-70.946,0L40.37,281.428
                        c-19.557,19.56-19.557,51.386,0.001,70.946l61.153,61.153c9.475,9.476,22.074,14.693,35.473,14.693h114.188
                        c13.4,0,25.998-5.219,35.473-14.693l25.678-25.678v-0.001l182.941-182.942C514.837,185.347,514.837,153.52,495.276,133.96z
                        M263.009,389.878c-3.158,3.158-7.358,4.897-11.824,4.897H136.997c-4.467,0-8.666-1.739-11.824-4.897l-61.152-61.152
                        c-6.521-6.521-6.521-17.129-0.001-23.65l70.948-70.948l141.895,141.895L263.009,389.878z M300.512,352.375L158.617,210.48
                        L273.973,95.124l141.894,141.894L300.512,352.375z M471.629,181.258l-32.113,32.113L297.622,71.475l32.113-32.113
                        c6.522-6.521,17.129-6.519,23.65,0l118.244,118.245C478.148,164.128,478.148,174.737,471.629,181.258z"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <path d="M495.278,477.546H16.722C7.487,477.546,0,485.034,0,494.269s7.487,16.722,16.722,16.722h478.555
                        c9.235,0,16.722-7.487,16.722-16.722S504.513,477.546,495.278,477.546z"/>
                    </g>
                  </g>
                </svg>
              </div>
            </div>
          </div>
          
          <div className='bg-white pointer-events-auto hidden md:block'>
            {
              pathname.startsWith('/room')
              ?
              <button
                className='px-3 py-1.5 flex items-center gap-1 cursor-pointer select-none border-red-600 border-2 rounded'
                onClick={() => { router.push('/') }}
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#E7000B" strokeWidth="1.5"/>
                  <path d="M8 12C8 10.1144 8 9.17157 8.58579 8.58579C9.17157 8 10.1144 8 12 8C13.8856 8 14.8284 8 15.4142 8.58579C16 9.17157 16 10.1144 16 12C16 13.8856 16 14.8284 15.4142 15.4142C14.8284 16 13.8856 16 12 16C10.1144 16 9.17157 16 8.58579 15.4142C8 14.8284 8 13.8856 8 12Z" stroke="#E7000B" strokeWidth="1.5"/>
                </svg>
                <span className='text-sm text-red-600 font-semibold'>Stop</span>
              </button>
              :
              <button 
                className='px-3 py-1.5 flex items-center gap-1 cursor-pointer select-none border-2 rounded'
                onClick={createRoom}
                disabled={loading}
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.6311 7.15517C15.9018 7.05482 16.1945 7 16.5001 7C17.8808 7 19.0001 8.11929 19.0001 9.5C19.0001 10.8807 17.8808 12 16.5001 12C16.1945 12 15.9018 11.9452 15.6311 11.8448" stroke="#323232" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M3 19C3.69137 16.6928 5.46998 16 9.5 16C13.53 16 15.3086 16.6928 16 19" stroke="#323232" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M17 15C19.403 15.095 20.5292 15.6383 21 17" stroke="#323232" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M13 9.5C13 11.433 11.433 13 9.5 13C7.567 13 6 11.433 6 9.5C6 7.567 7.567 6 9.5 6C11.433 6 13 7.567 13 9.5Z" stroke="#323232" strokeWidth="2"/>
                </svg>
                <span className='text-sm font-semibold'>
                  Collaborate
                </span>
              </button>
            }
          </div>
        </div>
      </nav>
      {
        menuOpen &&
        <div 
          className='w-3xs bg-white fixed top-18 left-4 pointer-events-auto border border-gray-200 shadow-md rounded'
          onMouseDown={(e) => {e.preventDefault()}}
        >
          {
            profile ?
            <div className='h-[calc(100vh-170px)] p-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 overflow-y-scroll'>
              <p>Account</p>
              <p>Rooms</p>
              <p>Logout</p>
            </div>
            :
            <div className='h-[calc(100vh-170px)] p-4 flex flex-col justify-around'>
              <div className='space-y-2'>
                <button 
                  className='w-full px-3 py-1 font-semibold border-2 rounded'
                  onClick={
                    () => {
                      setMenuOpen(false);
                      setRoute('login');
                      setAuthContainer(true);
                    }
                  }
                >
                  Login
                </button>
                <button 
                  className='w-full px-3 py-1 bg-black text-white font-semibold border-black border-2 rounded'
                  onClick={
                    () => {
                      setMenuOpen(false);
                      setRoute('register');
                      setAuthContainer(true);
                    }
                  }
                >
                  Get Started
                </button>
              </div>
            </div>
          }
        </div>
      }

      {
        authContainer &&
        <AuthContainer route={route} onClose={() => setAuthContainer(false)} />
      }
    </>
  )
}