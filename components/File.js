import { useEffect, useState } from 'react'

export default function RenderFile({
  file,
  id,
  removeFile,
  setPhoto,
}) {
  switch (file?.type) {
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return (
        <a
          className="flex w-full justify-between rounded-lg bg-white shadow"
          href={URL.createObjectURL(file)}
          target="_blank"
        >
          <img
            src="/assets/files/file-document-powerpoint-presentation-report-44515.svg"
            alt="Powerpoint Icon"
            className="m-1 h-11 w-11"
          />
          <div className="ml-2 flex-1 text-left line-clamp-1">
            <p className="line-clamp-1">{file?.name}</p>
            <p className="text-sm text-gray-700">
              application/powerpoint
            </p>
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
      break
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return (
        <a
          className="flex w-full justify-between rounded-lg bg-white shadow"
          href={URL.createObjectURL(file)}
          target="_blank"
        >
          <img
            src="/assets/files/file-document-docx-text-type-word-writing-44508.svg"
            alt="Word Icon"
            className="m-1 h-11 w-11"
          />
          <div className="ml-2 flex-1 text-left line-clamp-1">
            <p>{file?.name}</p>
            <p className="text-sm text-gray-700">
              application/word
            </p>
          </div>
          {removeFile && (
            <button
              className="m-1 h-4 w-4 fill-current text-red-600"
              onClick={(e) => removeFile(e, id)}
              href={URL.createObjectURL(file)}
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
      break
    case 'application/pdf':
      return (
        <a
          className="flex w-full justify-between rounded-lg bg-white shadow"
          href={URL.createObjectURL(file)}
          target="_blank"
        >
          <img
            src="/assets/files/file-pdf-acrobat-document-adobe-pdf-icon-reader-44504.svg"
            alt="PDF Icon"
            className="m-1 h-11 w-11"
          />
          <div className="ml-2 flex-1 text-left line-clamp-1">
            <p>{file?.name}</p>
            <p className="text-sm text-gray-700">
              application/pdf
            </p>
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
      break
    case 'image/jpeg':
    case 'image/png':
    case 'image/jpg':
      return (
        <a
          className="flex w-full justify-between rounded-lg bg-white shadow transition-all duration-500"
          href={URL.createObjectURL(file)}
          target="_blank"
        >
          <img
            src={URL.createObjectURL(file)}
            alt="Project Image"
            className="h-16 w-[10%] rounded-l-lg object-cover object-center"
          />
          <div className="ml-2 flex-1 p-2 text-left line-clamp-1">
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
      break
    default:
      return (
        <a className="flex w-full justify-between rounded-lg bg-white shadow">
          <img
            v-else
            src="/assets/files/file-doc-document-filetypes-text-word-xls-44511.svg"
            alt="File Icon"
            className="m-1 h-11 w-11"
          />
          <div className="ml-2 flex-1 text-left line-clamp-1">
            <p>{file?.name}</p>
            <p className="text-sm text-gray-700 line-clamp-1">
              {file?.type}
            </p>
          </div>
          <div className="flex items-end">
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
          </div>
        </a>
      )
      break
  }
}
