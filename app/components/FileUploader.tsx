import { useCallback } from 'react';
import { useDropzone } from "react-dropzone";
import { formatSize } from "~/lib/utils";

interface FileUploaderProps {
    onFileSelect?: (file: File | null) => void;
}

const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        onFileSelect?.(acceptedFiles[0] ?? null);
    }, [onFileSelect]);

    const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
        onDrop,
        multiple: false,
        accept: { 'application/pdf': ['.pdf'] },
        maxSize: 20 * 1024 * 1024,
    });

    const file = acceptedFiles[0] ?? null;

    return (
        <div className="w-full" {...getRootProps()}>
            <input {...getInputProps()} />
            {file ? (
                <div className="uploader-selected-file" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                            <img src='/images/pdf.png' alt='pdf' className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800 truncate max-w-xs">{file.name}</p>
                            <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                        </div>
                    </div>
                    <button
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors duration-200 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onFileSelect?.(null); }}
                    >
                        <img src='/icons/cross.svg' alt='remove' className='w-3.5 h-3.5 opacity-60' />
                    </button>
                </div>
            ) : (
                <div className={`uplader-drag-area flex flex-col items-center justify-center gap-3 ${isDragActive ? 'border-indigo-400 bg-indigo-50/40' : ''}`}>
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <img src="/icons/info.svg" alt='upload' className="w-7 h-7 opacity-60" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                            {isDragActive ? "Drop it here!" : <><span className="text-indigo-600">Click to upload</span> or drag & drop</>}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF only · max 20 MB</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUploader;
