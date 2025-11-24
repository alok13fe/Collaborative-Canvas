"use client";
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch} from '@/lib/hooks';
import AuthContainer from './AuthContainer';
import axios, { isAxiosError } from 'axios';
import { Image, Shape, ShapeProperties } from '@repo/common/shapes';
import { useRouter, usePathname } from 'next/navigation';
import { nanoid } from 'nanoid';
import { setUserProfile } from '@/lib/features/user/userSlice';
import { changeSelectedTool, addShape, modifyShape, deleteShapes, toggleLockTool, stopCollaborating, resetBoard, setShapeProperties } from '@/lib/features/board/boardSlice';
import { useSocketContext } from '@/contexts/SocketContext';
import ColorPicker from './ColorPicker';

const strokeColors = [
  {
    color: 'transparent',
    default: false
  },
  {
    color: '#000000',
    default: true,
  }, 
  {
    color: '#343a40',
    default: false,
    shades: []
  }, 
  {
    color: '#1e1e1e',
    default: false,
    shades: []
  }, 
  {
    color: '#846358',
    default: false,
    shades: []
  }, 
  {
    color: '#0c8599',
    default: false,
    shades: []
  }, 
  {
    color: '#1971c2',
    default: true,
    shades: []
  }, 
  {
    color: '#6741d9',
    default: false,
    shades: []
  }, 
  {
    color: '#9c36b5',
    default: false,
    shades: []
  }, 
  {
    color: '#c2255c',
    default: false,
    shades: []
  }, 
  {
    color: '#2f9e44',
    default: false,
    shades: []
  }, 
  {
    color: '#099268',
    default: true,
    shades: []
  }, 
  {
    color: '#f08c00',
    default: true,
    shades: []
  }, 
  {
    color: '#e03131',
    default: true,
    shades: []
  }
];

const backgroundColors = [
  {
    color: 'transparent',
    default: true
  },
  {
    color: '#000000',
    default: false,
  },
  {
    color: '#e9ecef',
    default: false,
    shades: []
  },
  {
    color: '#1e1e1e',
    default: false,
    shades: []
  },
  {
    color: '#eaddd7',
    default: false,
    shades: []
  },
  {
    color: '#99e9f2',
    default: false,
    shades: []
  },
  {
    color: '#a5d8ff',
    default: true,
    shades: []
  },
  {
    color: '#d0bfff',
    default: false,
    shades: []
  },
  {
    color: '#eebefa',
    default: false,
    shades: []
  },
  {
    color: '#fcc2d7',
    default: false,
    shades: []
  },
  {
    color: '#b2f2bb',
    default: true,
    shades: []
  },
  {
    color: '#96f2d7',
    default: false,
    shades: []
  },
  {
    color: '#ffec99',
    default: true,
    shades: []
  },
  {
    color: '#ffd8a8',
    default: false,
    shades: []
  },
  {
    color: '#ffc9c9',
    default: true,
    shades: []
  }
];

export default function Navbar() {

  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  
  const { profile } = useAppSelector(state => state.user);
  const { selectedTool, lockTool, selectedShapes, existingShapes, shapeProperties } = useAppSelector(state => state.board);
  const { socket } = useSocketContext();

  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedShapeActions, setSelectedShapeActions] = useState(false);
  const [strokeColorPicker, setStrokeColorPicker] = useState(false);
  const [backgroundColorPicker, setBackgroundColorPicker] = useState(false);
  const [showAvailiableFonts, setShowAvailiableFonts] = useState(false);
  const [selectedShapeTypes, setSelectedShapeTypes] = useState(0);
  const [selectedShapeProperties, setSelectedShapeProperties] = useState(shapeProperties);
  const [authContainer, setAuthContainer] = useState<boolean>(false);
  const [route, setRoute] = useState<string>('login');
  const [loading, setLoading] = useState(false);
  
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
          id: nanoid(),
          type: 'image',
          startX: 50,
          startY: 50,
          width: width,
          height: height,
          url: response.data.data.url,
          opacity: shapeProperties.opacity
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
    if(!profile){
      setAuthContainer(true);
      return;
    }
    
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
      if(isAxiosError(error)){
        if(error.status === 403){
          dispatch(setUserProfile(null));
          setAuthContainer(true);
        }
      }
    }
    setLoading(false);
  }

  async function leaveRoom() {
    dispatch(stopCollaborating());
    router.push('/');
  }

  useEffect(() => {
    if((selectedTool >= 2 && selectedTool <= 8) || selectedShapes.length > 0){
      if(selectedShapes.length === 0){
        setSelectedShapeTypes(1 << ( selectedTool - 2));
        setSelectedShapeProperties(shapeProperties);
      }
      else {
        const shapes = existingShapes.filter((shape) => {
          return selectedShapes.includes(shape.id);
        });

        let shapeTypes = 0;
        shapes.map(shape => {
          switch (shape.type){
            case "rect":
              shapeTypes = shapeTypes | 1;
              break;
            case "diamond":
              shapeTypes = shapeTypes | 2;
              break;
            case "ellipse":
              shapeTypes = shapeTypes | 4;
              break;
            case "arrow":
              shapeTypes = shapeTypes | 8;
              break;
            case "line":
              shapeTypes = shapeTypes | 16;
              break;
            case "pencil":
              shapeTypes = shapeTypes | 32;
              break;
            case "text":
              shapeTypes = shapeTypes | 64;
              break;
            case "image":
              shapeTypes = shapeTypes | 128;
              break;
          }
        });
        setSelectedShapeTypes(shapeTypes);

        const selectedShape = shapes[0];
        const newProperties: Partial<ShapeProperties> = {};

        switch(selectedShape.type){
          case "rect":
          case "diamond":
          case "ellipse":
            newProperties.stroke = selectedShape.stroke;
            newProperties.fillStyle = selectedShape.fillStyle;
            newProperties.strokeWidth = selectedShape.strokeWidth;
            newProperties.strokeStyle = selectedShape.strokeStyle;
            break;
          case "line":
          case "arrow":
            newProperties.stroke = selectedShape.stroke;
            newProperties.strokeWidth = selectedShape.strokeWidth;
            newProperties.strokeStyle = selectedShape.strokeStyle;
            break;
          case "pencil":
            newProperties.stroke = selectedShape.stroke;
            newProperties.strokeWidth = selectedShape.strokeWidth;
            break;
          case "text":
            newProperties.stroke = selectedShape.stroke;
            newProperties.fontFamily = selectedShape.fontFamily;
            newProperties.fontSize = selectedShape.fontSize;
            break;
        }

        setSelectedShapeProperties(prev => ({
          ...prev,
          ...newProperties,
          opacity: selectedShape.opacity
        }));
      }
      setSelectedShapeActions(true);
    }
    else{
      setSelectedShapeTypes(0);
      setSelectedShapeActions(false);
      setStrokeColorPicker(false);
      setBackgroundColorPicker(false);
      setShowAvailiableFonts(false);
    }
  },[selectedTool, selectedShapes, existingShapes, shapeProperties]);

  useEffect(() => {
    if(pathname.startsWith('/room') && !profile){
      setAuthContainer(true);
    }
  },[dispatch, pathname, profile, authContainer]);

  function reset(){
    if(pathname === '/'){
      dispatch(resetBoard());
    }
  }

  function logout(){
    dispatch(setUserProfile(null));
    localStorage.removeItem('token');
  }

  function handleShapeProperties(properties: Partial<ShapeProperties>){
    if(selectedShapes.length !== 0){
      const roomId = pathname.replace('/room/','');
      const [key, value] = Object.entries(properties)[0];
      const selected: Shape[] = existingShapes.filter(shape => selectedShapes.includes(shape.id));

      selected.forEach(shape => {
        let updatedShape = { ...shape };

        if(shape.type === 'text' && key === 'fontSize'){
          let updatedHeight = shape.height;
          
          if(typeof(value) === 'number'){
            updatedHeight = (shape.height * value) / shape.fontSize;
          }
          const scale = updatedHeight / shape.height;
          const width = shape.width * scale;

          if(updatedShape.type === 'text'){
            updatedShape = {
              ...updatedShape,
              height: updatedHeight,
              width
            }
          }
        }

        updatedShape = {
          ...updatedShape,
          [key]: value
        }

        dispatch(modifyShape(updatedShape));
        if(socket){
          socket.send(JSON.stringify({
            type: 'modify-shape',
            payload: {
              roomId: roomId,
              shape: updatedShape
            }
          }));
        }
      });

      setSelectedShapeProperties(prev => ({...prev, ...properties}));
    }
    else{
      dispatch(setShapeProperties(properties));
    }
  }

  function handleCopyShapes(){
    const shapes = existingShapes.filter((shape) => {
      return selectedShapes.includes(shape.id);
    });

    navigator.clipboard.writeText(JSON.stringify(shapes));
  }

  function handleDeleteShapes(){
    if(selectedShapes.length !== 0){
      const roomId = pathname.replace('/room/','');
      dispatch(deleteShapes(selectedShapes));
      
      if(socket){
        selectedShapes.map((shapeId) => {
          socket.send(JSON.stringify({
            type: 'delete-shape',
            payload: {
              roomId,
              shapeId
            }
          }));
        });
      }
    }
  }

  function handleStrokeColorPicker(){
    if(strokeColorPicker === false){
      setBackgroundColorPicker(false);
      setShowAvailiableFonts(false);
    }
    setStrokeColorPicker(curr => !curr);
  }

  function handleBackgroundColorPicker(){
    if(backgroundColorPicker === false){
      setStrokeColorPicker(false);
      setShowAvailiableFonts(false);
    }
    setBackgroundColorPicker(curr => !curr);
  }

  function handleShowAvailiableFonts(){
    if(showAvailiableFonts === false){
      setStrokeColorPicker(false);
      setBackgroundColorPicker(false);
    }
    setShowAvailiableFonts(curr => !curr);
  }

  return (
    <>
      <nav className='p-4 w-full fixed top-0 left-0 z-10 pointer-events-none'>
        <div className='flex justify-between items-start'>
          {/* Hamburger Menu */}
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
            {/* Lock Tool */}
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
              {/* Hand Tool */}
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 9 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(9)) }}
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg" aria-labelledby="panIconTitle" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" color="#000000">
                  <path d="M20,14 L20,17 C20,19.209139 18.209139,21 16,21 L10.0216594,21 C8.75045497,21 7.55493392,20.3957659 6.80103128,19.3722467 L3.34541668,14.6808081 C2.81508416,13.9608139 2.94777982,12.950548 3.64605479,12.391928 C4.35756041,11.8227235 5.38335813,11.8798792 6.02722571,12.5246028 L8,14.5 L8,13 L8.00393081,13 L8,11 L8.0174523,6.5 C8.0174523,5.67157288 8.68902517,5 9.5174523,5 C10.3458794,5 11.0174523,5.67157288 11.0174523,6.5 L11.0174523,11 L11.0174523,4.5 C11.0174523,3.67157288 11.6890252,3 12.5174523,3 C13.3458794,3 14.0174523,3.67157288 14.0174523,4.5 L14.0174523,11 L14.0174523,5.5 C14.0174523,4.67157288 14.6890252,4 15.5174523,4 C16.3458794,4 17.0174523,4.67157288 17.0174523,5.5 L17.0174523,11 L17.0174523,7.5 C17.0174523,6.67157288 17.6890252,6 18.5174523,6 C19.3458794,6 20.0174523,6.67157288 20.0174523,7.5 L20.0058962,14 L20,14 Z"/> 
                </svg>
              </div>

              {/* Selection Tool */}
              <div 
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 1 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(1)) }}  
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.5266 12.5324L20 20M19.0117 9.81874L12.8083 12.3731C12.6945 12.4199 12.6377 12.4434 12.5895 12.4783C12.5468 12.5093 12.5093 12.5468 12.4783 12.5895C12.4434 12.6377 12.4199 12.6945 12.3731 12.8083L9.81874 19.0117C9.56565 19.6264 9.43911 19.9337 9.2675 20.0169C9.11884 20.0889 8.94417 20.0829 8.80082 20.0008C8.63535 19.906 8.53025 19.5907 8.32005 18.9601L3.50599 4.51792C3.34314 4.02937 3.26172 3.7851 3.31964 3.62265C3.37005 3.48129 3.48129 3.37005 3.62265 3.31964C3.7851 3.26172 4.02937 3.34314 4.51792 3.50599L18.9601 8.32005C19.5907 8.53025 19.906 8.63535 20.0008 8.80082C20.0829 8.94417 20.0889 9.11884 20.0169 9.2675C19.9337 9.43911 19.6264 9.56565 19.0117 9.81874Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Square */}
              <div 
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 2 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(2)) }}  
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Diamond */}
              <div 
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 3 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(3)) }}  
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.26244 14.2628C3.47041 13.4707 3.07439 13.0747 2.92601 12.618C2.7955 12.2164 2.7955 11.7837 2.92601 11.382C3.07439 10.9253 3.47041 10.5293 4.26244 9.73727L9.73703 4.26268C10.5291 3.47065 10.9251 3.07463 11.3817 2.92626C11.7834 2.79574 12.2161 2.79574 12.6178 2.92626C13.0745 3.07463 13.4705 3.47065 14.2625 4.26268L19.7371 9.73727C20.5291 10.5293 20.9251 10.9253 21.0735 11.382C21.204 11.7837 21.204 12.2164 21.0735 12.618C20.9251 13.0747 20.5291 13.4707 19.7371 14.2628L14.2625 19.7373C13.4705 20.5294 13.0745 20.9254 12.6178 21.0738C12.2161 21.2043 11.7834 21.2043 11.3817 21.0738C10.9251 20.9254 10.5291 20.5294 9.73703 19.7373L4.26244 14.2628Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Circle */}
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 4 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(4)) }}  
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Arrow */}
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 5 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(5)) }}  
              >
                <svg fill="#000000" width="18px" height="18px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.707,18.707a1,1,0,0,1-1.414-1.414L19.586,13H2a1,1,0,0,1,0-2H19.586L15.293,6.707a1,1,0,0,1,1.414-1.414l6,6a1,1,0,0,1,0,1.414Z"/>
                </svg>
              </div>

              {/* Line */}
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 6 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(6)) }}
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 12L18 12" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Pencil */}
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 7 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(7)) }}
              >
                <svg height="16px" width="16px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"  fill="#000000">
                  <path d="M497.209,88.393l-73.626-73.6c-19.721-19.712-51.656-19.729-71.376-0.017L304.473,62.51L71.218,295.816 c-9.671,9.662-17.066,21.341-21.695,34.193L2.238,461.6c-4.93,13.73-1.492,29.064,8.818,39.372 c10.318,10.317,25.659,13.739,39.39,8.801l131.565-47.286c12.851-4.628,24.539-12.032,34.201-21.694l220.801-220.817l0.017,0.017 l12.481-12.498l47.699-47.725l0.026-0.018C516.861,140.039,516.939,108.14,497.209,88.393z M170.064,429.26l-83.822,30.133 l-33.606-33.607l30.116-83.831c0.224-0.604,0.517-1.19,0.758-1.792l88.339,88.339C171.245,428.752,170.676,429.036,170.064,429.26z M191.242,415.831c-1.19,1.19-2.457,2.284-3.741,3.362l-94.674-94.674c1.069-1.276,2.163-2.552,3.352-3.741L327.685,89.22	l95.079,95.08L191.242,415.831z M472.247,134.808l-35.235,35.244l-1.767,1.767l-95.08-95.079l37.003-37.003	c5.921-5.896,15.506-5.905,21.454,0.017l73.625,73.609c5.921,5.904,5.93,15.489-0.026,21.47L472.247,134.808z"/>
                </svg>
              </div>

              {/* Text */}
              <div
                className={`p-2.5 cursor-pointer hover:bg-gray-200 rounded ${selectedTool === 8 ? 'bg-gray-200' : ''}`}
                onClick={() => { dispatch(changeSelectedTool(8)) }}
              >
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3V21M9 21H15M19 6V3H5V6" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Image */}
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

              {/* Eraser */}
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
          
          {/* Collaboration */}
          <div className='bg-white pointer-events-auto hidden md:block'>
            {
              pathname.startsWith('/room')
              ?
              <button
                className='px-3 py-1.5 flex items-center gap-1 cursor-pointer select-none border-red-600 border-2 rounded'
                onClick={leaveRoom}
              >
                <span className='text-sm text-red-600 font-semibold'>Leave</span>
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
          className='w-3xs bg-white fixed top-18 left-4 z-20 pointer-events-auto border border-gray-200 shadow-md rounded'
          onMouseDown={(e) => {e.preventDefault()}}
        >
          {
            profile ?
            <div className='h-[calc(100vh-170px)] p-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 overflow-y-scroll'>
              <div className='px-2 py-1 flex items-center cursor-pointer hover:bg-gray-100 rounded' onClick={() => {router.push('/account')}}>
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 21C5 17.134 8.13401 14 12 14C15.866 14 19 17.134 19 21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className='pl-1'>Account</span>
              </div>
              <div className='px-2 py-1 flex items-center cursor-pointer hover:bg-gray-100 rounded' onClick={() => {router.push('/rooms')}}>
                <svg width="18px" height="18px" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg"><path fill="#000000" d="M224,288l0,32l272,0c8.837,0 16,7.163 16,16c0,8.837 -7.163,16 -16,16l-160.584,0l36.744,137.133c2.287,8.535 -2.778,17.309 -11.313,19.596c-8.536,2.287 -17.309,-2.778 -19.596,-11.314l-38.964,-145.415l-30.287,0l0,96c0,8.837 -7.163,16 -16,16c-8.837,0 -16,-7.163 -16,-16l0,-96l-30.287,0l-38.964,145.415c-2.287,8.536 -11.06,13.601 -19.596,11.314c-8.535,-2.287 -13.6,-11.061 -11.313,-19.596l36.744,-137.133l-160.584,0c-8.884,-0.048 -16,-7.193 -16,-16c0,-8.807 7.116,-15.952 16,-16l80,0l0,-32l128,0Zm-160,0l-32,0l0,-256c0,-17.673 14.327,-32 32,-32l384,0c17.673,0 32,14.327 32,32l0,256l-32,0l0,-256l-384,0l0,256Z"></path></svg>
                <span className='pl-1'>Rooms</span>
              </div>
              <div className='px-2 py-1 flex items-center cursor-pointer hover:bg-gray-100 rounded' onClick={reset}>
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H21M5 6V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V6M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 11V17" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 11V17" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className='pl-1'>Reset the Canvas</span>
              </div>
              <div className='px-2 py-1 flex items-center cursor-pointer hover:bg-gray-100 rounded' onClick={logout}>
                <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H15M8 8L4 12M4 12L8 16M4 12L16 12" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className='pl-1'>Logout</span>
              </div>
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
        selectedShapeActions &&
        <div 
          className='bg-white fixed top-18 left-4 z-10 pointer-events-auto border border-gray-200 shadow-md rounded'
        >
          <div
            className='h-[calc(100vh-170px)] p-4 space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 overflow-y-scroll'
          >
            {/* Stroke */}
            {
              (selectedShapeTypes & 127) !== 0 &&
              <div>
                <p className='text-xs'>Stroke</p>
                <div className='py-2 flex items-center'>
                  <div className='pr-2 flex space-x-2 border-r border-gray-300'>
                    {
                      strokeColors.map((stroke, idx) => {
                        if(stroke.default){
                          return (
                            <div 
                              key={idx} 
                              className="relative w-5 h-5 rounded" 
                              style={{ 
                                backgroundColor: stroke.color,
                              }}
                              onClick={() => {handleShapeProperties({stroke: stroke.color})}}
                            >
                              <div 
                                className='absolute -top-0.5 -left-0.5 w-6 h-6 rounded'
                                style={{ 
                                  boxShadow: selectedShapeProperties.stroke === stroke.color ? '0 0 0 1px ' : ''
                                }}
                              ></div>
                            </div>
                          )
                        }
                        return null;
                      })
                    }
                  </div>
                  <div 
                    className="ml-2 w-6 h-6 rounded" 
                    style={{backgroundColor: selectedShapeProperties.stroke}}
                    onClick={handleStrokeColorPicker}
                  ></div>
                </div>
              </div>
            }

            {/* Background */}
            {
              (selectedShapeTypes & 7) !== 0 &&
              <div>
                <p className='text-xs'>Background</p>
                <div className='py-2 flex items-center'>
                  <div className='pr-2 flex space-x-2 border-r border-gray-300'>
                    {
                      backgroundColors.map((background, idx) => {
                        if(background.default){
                          if(background.color === 'transparent'){
                            return (
                              <div 
                                key={idx} 
                                className="relative w-5 h-5 shadow-sm rounded" 
                                style={{backgroundImage: '../../public/transparent.png'}}
                                onClick={() => {handleShapeProperties({fillStyle: background.color})}}
                              >
                                <div 
                                  className='absolute -top-0.5 -left-0.5 w-6 h-6 rounded'
                                  style={{ 
                                    boxShadow: selectedShapeProperties.fillStyle === background.color ? '0 0 0 1px ' : ''
                                  }}
                                ></div>
                              </div>
                            )
                          }

                          return (
                            <div 
                              key={idx} 
                              className="relative w-5 h-5 shadow-sm rounded" 
                              style={{ backgroundColor: background.color }}
                              onClick={() => {handleShapeProperties({fillStyle: background.color})}} 
                            >
                              <div 
                                className='absolute -top-0.5 -left-0.5 w-6 h-6 rounded'
                                style={{ 
                                  boxShadow: selectedShapeProperties.fillStyle === background.color ? '0 0 0 1px ' : ''
                                }}
                              ></div>
                            </div>
                          )
                        }
                        return null;
                      })
                    }
                  </div>
                  <div 
                    className="ml-2 w-6 h-6 shadow-sm rounded" 
                    style={{backgroundColor: selectedShapeProperties.fillStyle}}
                    onClick={handleBackgroundColorPicker}
                  ></div>
                </div>
              </div>
            }

            {/* Stroke Width */}
            {
              (selectedShapeTypes & 63) !== 0 &&
              <div>
                <p className='text-xs'>Stroke width</p>
                <div className='py-2 flex space-x-2'>
                  <div 
                    className={`w-7 h-7 flex items-center justify-center ${selectedShapeProperties.strokeWidth === 1 ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                    onClick={() => {handleShapeProperties({strokeWidth: 1})}}
                  >
                    <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L18 12" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div 
                    className={`w-7 h-7 flex items-center justify-center ${selectedShapeProperties.strokeWidth === 2 ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                    onClick={() => {handleShapeProperties({strokeWidth: 2})}}
                  >
                    <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L18 12" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div 
                    className={`w-7 h-7 flex items-center justify-center ${selectedShapeProperties.strokeWidth === 3 ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                    onClick={() => {handleShapeProperties({strokeWidth: 3})}}
                  >
                    <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L18 12" stroke="#000000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            }
            
            {/* Stroke Style */}
            {
              (selectedShapeTypes & 31) !== 0 &&
              <div>
                <p className='text-xs'>Stroke style</p>
                <div className='py-2 flex space-x-2'>
                  <div 
                    className={`w-7 h-7 flex items-center justify-center ${selectedShapeProperties.strokeStyle === 1 ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                    onClick={() => {handleShapeProperties({strokeStyle: 1})}}
                  >
                    <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L18 12" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div 
                    className={`w-7 h-7 flex items-center justify-center ${selectedShapeProperties.strokeStyle === 2 ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                    onClick={() => {handleShapeProperties({strokeStyle: 2})}}
                  >
                    <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <g strokeWidth="2">
                        <path stroke='none' d='M0 0h24v24H0z' fill='none'></path>
                        <path d='M5 12h2'></path>
                        <path d='M17 12h2'></path>
                        <path d='M11 12h2'></path>
                      </g>
                    </svg>
                  </div>
                  <div 
                    className={`w-7 h-7 flex items-center justify-center ${selectedShapeProperties.strokeStyle === 3 ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                    onClick={() => {handleShapeProperties({strokeStyle: 3})}}
                  >
                    <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <g strokeWidth="2">
                        <path stroke='none' d='M0 0h24v24H0z' fill='none'></path>
                        <path d='M4 12v.01'></path>
                        <path d='M8 12v.01'></path>
                        <path d='M12 12v.01'></path>
                        <path d='M16 12v.01'></path>
                        <path d='M20 12v.01'></path>
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            }
            
            {/* Edges */}
            {
              (selectedShapeTypes & 3) !== 0 &&
              <div>
                <p className='text-xs'>Edges</p>
                <div className='py-2 flex space-x-2'>
                  <div 
                    className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.edges === 'corner' ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                    onClick={() => {handleShapeProperties({edges: 'corner'})}}
                  >
                    <svg width="18px" height="18px" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3.33334 9.99998V6.66665C3.33334 6.04326 3.33403 4.9332 3.33539 3.33646C4.95233 3.33436 6.06276 3.33331 6.66668 3.33331H10"></path>
                        <path d="M13.3333 3.33331V3.34331"></path>
                        <path d="M16.6667 3.33331V3.34331"></path>
                        <path d="M16.6667 6.66669V6.67669"></path>
                        <path d="M16.6667 10V10.01"></path>
                        <path d="M3.33334 13.3333V13.3433"></path>
                        <path d="M16.6667 13.3333V13.3433"></path>
                        <path d="M3.33334 16.6667V16.6767"></path>
                        <path d="M6.66666 16.6667V16.6767"></path>
                        <path d="M10 16.6667V16.6767"></path>
                        <path d="M13.3333 16.6667V16.6767"></path>
                        <path d="M16.6667 16.6667V16.6767"></path>
                    </svg>
                  </div>
                  <div 
                    className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.edges === 'round' ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                    onClick={() => {handleShapeProperties({edges: 'round'})}}
                  >
                    <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <g>
                        <path stroke="none" d="M0 0h24v24H0z" fill="none">
                        </path> == $0
                        <path d="M4 12v-4a4 4 0 0 1 4 -4h4"></path>
                        <line x1="16" y1="4" x2="16" y2="4.01"></line>
                        <line x1="20" y1="4" x2="20" y2="4.01"></line>
                        <line x1="20" y1="8" x2="20" y2="8.01"></line>
                        <line x1="20" y1="12" x2="20" y2="12.01"></line>
                        <line x1="4" y1="16" x2="4" y2="16.01"></line>
                        <line x1="20" y1="16" x2="20" y2="16.01"></line>
                        <line x1="4" y1="20" x2="4" y2="20.01"></line>
                        <line x1="8" y1="20" x2="8" y2="20.01"></line>
                        <line x1="12" y1="20" x2="12" y2="20.01"></line>
                        <line x1="16" y1="20" x2="16" y2="20.01"></line>
                        <line x1="20" y1="20" x2="20" y2="20.01"></line>
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            }
            
            {
              (selectedShapeTypes & 64) !== 0 &&
              <>
                {/* Font Family */}
                <div>
                  <p className='text-xs'>Font family</p>
                  <div className='py-2 flex space-x-2'>
                    <div 
                      className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.fontFamily[1] === 'S' ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                      onClick={() => {handleShapeProperties({fontFamily: "'Shadows Into Light Two', 'Shadows Into Light Two Fallback'"})}}
                    >
                      <svg height="16px" width="16px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"  fill="#000000">
                        <path d="M497.209,88.393l-73.626-73.6c-19.721-19.712-51.656-19.729-71.376-0.017L304.473,62.51L71.218,295.816 c-9.671,9.662-17.066,21.341-21.695,34.193L2.238,461.6c-4.93,13.73-1.492,29.064,8.818,39.372 c10.318,10.317,25.659,13.739,39.39,8.801l131.565-47.286c12.851-4.628,24.539-12.032,34.201-21.694l220.801-220.817l0.017,0.017 l12.481-12.498l47.699-47.725l0.026-0.018C516.861,140.039,516.939,108.14,497.209,88.393z M170.064,429.26l-83.822,30.133 l-33.606-33.607l30.116-83.831c0.224-0.604,0.517-1.19,0.758-1.792l88.339,88.339C171.245,428.752,170.676,429.036,170.064,429.26z M191.242,415.831c-1.19,1.19-2.457,2.284-3.741,3.362l-94.674-94.674c1.069-1.276,2.163-2.552,3.352-3.741L327.685,89.22	l95.079,95.08L191.242,415.831z M472.247,134.808l-35.235,35.244l-1.767,1.767l-95.08-95.079l37.003-37.003	c5.921-5.896,15.506-5.905,21.454,0.017l73.625,73.609c5.921,5.904,5.93,15.489-0.026,21.47L472.247,134.808z"/>
                      </svg>
                    </div>
                    <div
                      className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.fontFamily[1] === 'R' ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                      onClick={() => {handleShapeProperties({fontFamily: "'Roboto', 'Roboto Fallback'"})}}
                    >
                      A
                    </div>
                    <div 
                      className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.fontFamily[1] === 'N' ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                      onClick={() => {handleShapeProperties({fontFamily: "'Nunito', 'Nunito Fallback'"})}}
                    >
                      <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 8L3 11.6923L7 16M17 8L21 11.6923L17 16M14 4L10 20" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div 
                      className='w-7 h-7 flex justify-center items-center bg-gray-100 rounded'
                      onClick={handleShowAvailiableFonts}
                    >
                      <svg width="18px" height="18px" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M2.5 4.5C2.5 3.09886 3.59886 2 5 2H12.499C12.7752 2 13 2.22386 13 2.5C13 2.77614 12.7761 3 12.5 3H8.69244L8.40509 3.85458C8.18869 4.49752 7.89401 5.37197 7.58091 6.29794C7.50259 6.52956 7.42308 6.76453 7.34332 7H8.5C8.77614 7 9 7.22386 9 7.5C9 7.77614 8.77614 8 8.5 8H7.00407C6.56724 9.28543 6.16435 10.4613 5.95799 11.0386C5.63627 11.9386 5.20712 12.4857 4.66741 12.7778C4.16335 13.0507 3.64154 13.0503 3.28378 13.05L3.25 13.05C2.94624 13.05 2.7 12.8037 2.7 12.5C2.7 12.1962 2.94624 11.95 3.25 11.95C3.64182 11.95 3.9035 11.9405 4.14374 11.8105C4.36443 11.691 4.65532 11.4148 4.92217 10.6683C5.10695 10.1514 5.45375 9.14134 5.8422 8H4.5C4.22386 8 4 7.77614 4 7.5C4 7.22386 4.22386 7 4.5 7H6.18187C6.30127 6.64785 6.42132 6.29323 6.53887 5.94559C6.85175 5.02025 7.14627 4.14631 7.36256 3.50368L7.53192 3H5C4.15114 3 3.5 3.65114 3.5 4.5C3.5 4.77614 3.27614 5 3 5C2.72386 5 2.5 4.77614 2.5 4.5Z"
                          fill="#000000"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <p className='text-xs'>Font size</p>
                  <div className='py-2 flex space-x-2'>
                    <div
                      className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.fontSize === 20 ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                      onClick={() => {handleShapeProperties({fontSize: 20})}}
                    >
                      <p className='font-light'>S</p>
                    </div>
                    <div
                      className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.fontSize === 28 ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                      onClick={() => {handleShapeProperties({fontSize: 28})}}
                    >
                      <p className='font-light'>M</p>
                    </div>
                    <div
                      className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.fontSize === 36 ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                      onClick={() => {handleShapeProperties({fontSize: 36})}}
                    >
                      <p className='font-light'>L</p>
                    </div>
                    <div
                      className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.fontSize === 48 ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                      onClick={() => {handleShapeProperties({fontSize: 48})}}
                    >
                      <p className='font-light'>XL</p>
                    </div>
                  </div>
                </div>
    
                {/* Text Align */}
                <div>
                  <p className='text-xs'>Text Align</p>
                  <div className='py-2 flex space-x-2'>
                    <div 
                      className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.textAlign === 'left' ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                      onClick={() => {handleShapeProperties({textAlign: "left"})}}
                    >
                      <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g>
                        <path d="M4 18H14M4 14H20M4 10H14M4 6H20" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </g>
                      </svg>
                    </div>
                    <div 
                      className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.textAlign === 'center' ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                      onClick={() => {handleShapeProperties({textAlign: "center"})}}
                    >
                      <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g>
                        <path d="M17 18H7M20 14H4M17 10H7M20 6H4" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </g>
                      </svg>
                    </div>
                    <div 
                      className={`w-7 h-7 flex justify-center items-center ${selectedShapeProperties.textAlign === 'right' ? 'bg-gray-300' : 'bg-gray-100'} rounded`}
                      onClick={() => {handleShapeProperties({textAlign: "right"})}}
                    >
                      <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g>
                        <path d="M20 18H10M20 14H4M20 10H10M20 6H4" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              </>
            }

            {/* Opacity */}
            <div>
              <p className='text-xs'>Opacity</p>
              <div className='py-1'>
                <input 
                  min='0'
                  max='100'
                  step='10'
                  type='range'
                  className='w-full'
                  value={selectedShapeProperties.opacity}
                  onChange={(e) => {handleShapeProperties({opacity: parseInt(e.target.value)})}}
                />
                <div className='relative w-full mb-4'>
                  <p className='absolute left-0 text-xs'>0</p>
                  {
                    selectedShapeProperties.opacity !== 0 &&
                    <p 
                      style={{
                        position: 'absolute',
                        left: (selectedShapeProperties.opacity * 0.92) + '%'
                      }}
                      className='text-xs'
                    >
                      {selectedShapeProperties.opacity}
                    </p>
                  }
                </div>
              </div>
            </div>
            
            {/* Align */}

            {/* Layers */}
            <div>
              <p className='text-xs'>Layers</p>
              <div className='py-2 flex space-x-2'>
                <div className='w-7 h-7 flex justify-center items-center bg-gray-100 rounded'>
                  <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g>
                    <path id="Vector" d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </g>
                  </svg>
                </div>
                <div className='w-7 h-7 flex items-center justify-center bg-gray-100 rounded'>
                  <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g>
                  <path id="Vector" d="M12 21L17 16M12 21L7 16M12 21V3" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>
                  </svg>
                </div>
                <div className='w-7 h-7 flex items-center justify-center bg-gray-100 rounded'>
                  <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g>
                  <path id="Vector" d="M12 3L7 8M12 3L17 8M12 3V21" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>
                  </svg>
                </div>
                <div className='w-7 h-7 flex items-center justify-center bg-gray-100 rounded'>
                  <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g>
                    <path id="Vector" d="M18 3H6M12 21V7M12 7L7 12M12 7L17 12" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            {
              selectedTool === 1 &&
              <div>
                <p className='text-xs'>Actions</p>
                <div className='py-2 flex space-x-2'>
                  <div 
                    className='w-7 h-7 flex justify-center items-center bg-gray-100 hover:bg-gray-300 rounded'
                    onClick={handleCopyShapes}
                  >
                    <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5.11765 15.7059C3.9481 15.7059 3 14.7578 3 13.5882V5.11765C3 3.9481 3.9481 3 5.11765 3H13.5882C14.7578 3 15.7059 3.9481 15.7059 5.11765V5.64706" />
                    <rect x="8.29413" y="8.29412" width="12.7059" height="12.7059" rx="1.5" />
                    </svg>
                  </div>
                  <div 
                    className='w-7 h-7 flex justify-center items-center bg-gray-100 hover:bg-gray-300 rounded'
                    onClick={handleDeleteShapes}
                  >
                    <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6H21M5 6V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V6M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6" />
                    <path d="M14 11V17" />
                    <path d="M10 11V17" />
                    </svg>
                  </div>
                </div>
              </div>
            }
          </div>
          {
            strokeColorPicker && (selectedShapeTypes & 127) !== 0 &&
            <div className='absolute top-3 left-full ml-5 bg-white'>
              <ColorPicker colors={strokeColors} selectedColor={selectedShapeProperties.stroke} handleChangeColor={(color) => {handleShapeProperties({stroke: color})}} />
            </div>
          }
          {
            backgroundColorPicker && (selectedShapeTypes & 7) !== 0 &&
            <div className='absolute top-18 left-full ml-5 bg-white'>
              <ColorPicker colors={backgroundColors} selectedColor={selectedShapeProperties.fillStyle} handleChangeColor={(color) => {handleShapeProperties({fillStyle: color})}} />
            </div>
          }
          {
            showAvailiableFonts && (selectedShapeTypes & 64) !== 0 &&
            <div className='absolute top-18 left-full ml-5 p-3 w-45 bg-white shadow-md rounded'>
              <p className='mb-2 text-xs'>Availiable Fonts</p>
              <div className='space-y-0.5'>
                <p 
                  className={`px-2 py-1 text-sm ${selectedShapeProperties.fontFamily[1] === 'S' && 'bg-gray-300'} hover:bg-gray-100 rounded`} 
                  style={{
                    fontFamily: "'Shadows Into Light Two', 'Shadows Into Light Two Fallback'"
                  }}
                  onClick={() => {handleShapeProperties({fontFamily: "'Shadows Into Light Two', 'Shadows Into Light Two Fallback'"})}}
                  >
                  Shadows Into Light Two
                </p>
                <p 
                  className={`px-2 py-1 text-sm ${selectedShapeProperties.fontFamily[1] === 'N' && 'bg-gray-300'} hover:bg-gray-100 rounded`}
                  style={{
                    fontFamily: "'Nunito', 'Nunito Fallback'"
                  }}
                  onClick={() => {handleShapeProperties({fontFamily: "'Nunito', 'Nunito Fallback'"})}}
                  >
                  Nunito
                </p>
                <p 
                  className={`px-2 py-1 text-sm ${selectedShapeProperties.fontFamily[1] === 'R' && 'bg-gray-300'} hover:bg-gray-100 rounded`}
                  style={{
                    fontFamily: "'Roboto', 'Roboto Fallback'"
                  }}
                  onClick={() => {handleShapeProperties({fontFamily: "'Roboto', 'Roboto Fallback'"})}}
                  >
                  Roboto
                </p>
                <p 
                  className={`px-2 py-1 text-sm ${selectedShapeProperties.fontFamily[1] === 'C' && 'bg-gray-300'} hover:bg-gray-100 rounded`}
                  style={{
                    fontFamily: "'Chewy', 'Chewy Fallback'"
                  }}
                  onClick={() => {handleShapeProperties({fontFamily: "'Chewy', 'Chewy Fallback'"})}}
                >
                  Chewy
                </p>
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