
type Color = {
  color: string;
  default: boolean;
  shades?: string[];
}

interface ColorPickerProps {
  colors: Color[] ;
  selectedColor: string;
  handleChangeColor: (color: string) => void;
}

export default function ColorPicker({colors, selectedColor, handleChangeColor}: ColorPickerProps) {
  return (
    <div className='p-3 w-45 shadow-md rounded'>
      <p className='mb-2 text-xs'>Colors</p>
      <div className='grid grid-cols-5 gap-x-2 gap-y-2'>
        {
          colors.map((color, idx) => {
            return (
              <div 
                key={idx} 
                className='relative w-6 h-6 shadow-sm rounded'
                style={{backgroundColor: color.color}}
                onClick={() => {handleChangeColor(color.color)}}
              >
                <div 
                  className='absolute -top-0.5 -left-0.5 w-7 h-7 rounded'
                  style={{ 
                    boxShadow: selectedColor === color.color ? '0 0 0 1px ' : ''
                  }}
                ></div>
              </div>
            )
          })
        }
      </div>
      {/* <p className='my-3 text-xs'>Shades</p> */}
      <p className='my-3 text-xs'>Hex Code</p>
      <div className='p-1 text-sm text-center border border-gray-300 rounded'>
        {selectedColor}
      </div>
    </div>
  )
}