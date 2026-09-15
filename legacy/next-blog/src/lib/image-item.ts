/**
 * 图片上传项类型（原先定义在 app/projects/components/image-upload-dialog.tsx，
 * 被 pictures 模块反向引用；projects 功能已下线，故提到 lib 作为共享类型）
 */
export type ImageItem = { type: 'url'; url: string } | { type: 'file'; file: File; previewUrl: string; hash?: string }
