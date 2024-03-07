export const useImageResolver = () => {
	const resolveImageFilenameNoExt = (fileName: string | undefined) => {
		if (!fileName) return 'default'
		return fileName.split('.').slice(0, -1).join('.') || 'default'
	}

	const resolveImageFileExtension = (fileName: string | undefined) => {
		if (!fileName) return 'png'
		return fileName.split('.').pop() || 'png'
	}

	const resolveImageSrc = (
		filename: string | null | undefined | unknown,
		source: string | undefined
	) => {
		if (!source || !filename) return 'static/images/default.png'
		return source
	}

	return {
		resolveImageFilenameNoExt,
		resolveImageFileExtension,
		resolveImageSrc
	}
}
