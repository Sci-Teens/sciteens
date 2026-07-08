import Image from 'next/image'
import {
  Presentation,
  FileText,
  File as FileIcon,
  X,
} from 'lucide-react'

export default function RenderFile({
  file,
  id,
  removeFile,
}) {
  switch (file?.type) {
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return (
        <a
          className="flex w-full justify-between rounded-lg bg-white shadow-sm"
          href={URL.createObjectURL(file)}
          target="_blank"
          rel="noreferrer"
        >
          <Presentation className="m-1 h-11 w-11 text-orange-600" />
          <div className="line-clamp-1 ml-2 flex-1 text-left">
            <p className="line-clamp-1">{file?.name}</p>
            <p className="text-sm text-gray-700">
              application/powerpoint
            </p>
          </div>
          {removeFile && (
            <button
              className="m-1 text-red-600"
              onClick={(e) => removeFile(e, id)}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </a>
      )
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return (
        <a
          className="flex w-full justify-between rounded-lg bg-white shadow-sm"
          href={URL.createObjectURL(file)}
          target="_blank"
          rel="noreferrer"
        >
          <FileText className="m-1 h-11 w-11 text-blue-600" />
          <div className="line-clamp-1 ml-2 flex-1 text-left">
            <p>{file?.name}</p>
            <p className="text-sm text-gray-700">
              application/word
            </p>
          </div>
          {removeFile && (
            <button
              className="m-1 text-red-600"
              onClick={(e) => removeFile(e, id)}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </a>
      )
    case 'application/pdf':
      return (
        <a
          className="flex w-full justify-between rounded-lg bg-white shadow-sm"
          href={URL.createObjectURL(file)}
          target="_blank"
          rel="noreferrer"
        >
          <FileText className="m-1 h-11 w-11 text-red-600" />
          <div className="line-clamp-1 ml-2 flex-1 text-left">
            <p>{file?.name}</p>
            <p className="text-sm text-gray-700">
              application/pdf
            </p>
          </div>
          {removeFile && (
            <button
              className="m-1 text-red-600"
              onClick={(e) => removeFile(e, id)}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </a>
      )
    case 'image/jpeg':
    case 'image/png':
    case 'image/jpg':
      return (
        <a
          className="flex w-full justify-between rounded-lg bg-white shadow-sm transition-all duration-500"
          href={URL.createObjectURL(file)}
          target="_blank"
          rel="noreferrer"
        >
          <Image
            src={URL.createObjectURL(file)}
            alt="Project"
            width={256}
            height={256}
            unoptimized
            className="h-16 w-[10%] rounded-l-lg object-cover object-center"
          />
          <div className="line-clamp-1 ml-2 flex-1 p-2 text-left">
            <p>{file?.name}</p>
            <p className="text-sm text-gray-700">image</p>
          </div>
          {removeFile && (
            <button
              className="m-1 h-4 w-4 fill-current text-red-600"
              onClick={(e) => removeFile(e, id)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM11.4 10l2.83-2.83-1.41-1.41L10 8.59 7.17 5.76 5.76 7.17 8.59 10l-2.83 2.83 1.41 1.41L10 11.41l2.83 2.83 1.41-1.41L11.41 10z" />
              </svg>
            </button>
          )}
        </a>
      )
    default:
      return (
        <a className="flex w-full justify-between rounded-lg bg-white shadow-sm">
          <FileIcon className="m-1 h-11 w-11 text-gray-500" />
          <div className="line-clamp-1 ml-2 flex-1 text-left">
            <p>{file?.name}</p>
            <p className="line-clamp-1 text-sm text-gray-700">
              {file?.type}
            </p>
          </div>
          <div className="flex items-end">
            {removeFile && (
              <button
                className="m-1 text-red-600"
                onClick={(e) => removeFile(e, id)}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </a>
      )
  }
}
