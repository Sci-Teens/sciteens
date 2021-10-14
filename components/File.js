import { useEffect, useState } from "react";

export default function RenderFile({ file }) {
    switch (file.type) {
        case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            return (
                <a className="bg-white rounded-lg w-full flex">
                    <img
                        src="/assets/files/file-document-powerpoint-presentation-report-44515.svg"
                        alt="Powerpoint Icon"
                        class="h-11 w-11 m-1"
                    />
                    <div className="ml-2 mt-1">
                        <p className="text-center line-clamp-1">
                            {file.name}
                        </p>
                        <p className="text-sm text-gray-700">
                            application/powerpoint
                        </p>
                    </div>
                    <button className="fill-current text-red-600 h-4 w-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM11.4 10l2.83-2.83-1.41-1.41L10 8.59 7.17 5.76 5.76 7.17 8.59 10l-2.83 2.83 1.41 1.41L10 11.41l2.83 2.83 1.41-1.41L11.41 10z" /></svg>
                    </button>
                </a>
            )
            break;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return (
                <a className="bg-white rounded-lg w-full flex justify-between">
                    <img
                        src="/assets/files/file-document-docx-text-type-word-writing-44508.svg"
                        alt="Word Icon"
                        class="h-11 w-11 m-1"
                    />
                    <div className="ml-2 line-clamp-1">
                        <p className="text-center">
                            {file.name}
                        </p>
                        <p className="text-sm text-gray-700">
                            application/word
                        </p>
                    </div>
                    <button className="fill-current text-red-600 h-4 w-4 justify-self-end">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM11.4 10l2.83-2.83-1.41-1.41L10 8.59 7.17 5.76 5.76 7.17 8.59 10l-2.83 2.83 1.41 1.41L10 11.41l2.83 2.83 1.41-1.41L11.41 10z" /></svg>
                    </button>
                </a>
            )
            break;
        case "application/pdf":
            return (
                <a className="bg-white rounded-lg w-full flex">
                    <img
                        src="/assets/files/file-pdf-acrobat-document-adobe-pdf-icon-reader-44504.svg"
                        alt="PDF Icon"
                        class="h-11 w-11 m-1"
                    />
                    <div className="ml-2">
                        <p className="text-center line-clamp-1">
                            {file.name}
                        </p>
                        <p className="text-sm text-gray-700">
                            application/pdf
                        </p>
                    </div>
                </a>
            )
            break;
        case "image/jpeg":
        case "image/png":
        case "image/jpg":
            return (
                <a className="bg-white rounded-lg w-full flex">
                    <img
                        src={URL.createObjectURL(file)}
                        alt="Project Image"
                        class="object-cover object-center rounded-l-lg h-12 w-12"
                    />
                    <div className="ml-2">
                        <p className="text-center line-clamp-1">
                            {file.name}
                        </p>
                        <p className="text-sm text-gray-700">
                            image
                        </p>
                    </div>
                </a>
            )
            break;
        default:
            return (
                <a className="bg-white rounded-lg w-full flex">
                    <img
                        v-else
                        src="/assets/files/file-doc-document-filetypes-text-word-xls-44511.svg"
                        alt="File Icon"
                        class="h-11 w-11 m-1"
                    />
                    <div className="ml-2">
                        <p className="text-center line-clamp-1">
                            {file.name}
                        </p>
                        <p className="text-sm line-clamp-1 text-gray-700">
                            {file.type}
                        </p>
                    </div>

                </a>
            )
            break;
    }

}