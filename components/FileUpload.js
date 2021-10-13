import { useState } from "react"
export default function FileUpload() {
    return (
        <>
            <label for="files" className="uppercase text-gray-600">
                File Upload
            </label>
            <div className="w-full h-40 border-2 bg-green-200 hover:bg-green-300 rounded-lg text-gray-700 border-gray-600 border-dashed flex items-center justify-center text-center"
                onDrag={e => { e.preventDefault(); console.log('dragging') }}
                onDrop={e => { e.preventDefault(); console.log('dropped') }}
            >
                Drag 'n' drop some files <br /> here, or click to select files
            </div>
            <input hidden className="w-full" type="file" onChange={e => { onChange(e, "file") }} />
        </>
    )
}