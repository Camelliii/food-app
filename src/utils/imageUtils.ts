/**
 * 图片工具函数
 */

/**
 * 获取菜谱的封面图片URL
 * 优先使用 cover_images[0]，如果没有则返回 undefined
 */
export function getRecipeImageUrl(recipe: any): string | undefined {
  // 优先使用原始数据中的 cover_images
  const originalData = recipe._originalData;
  if (originalData?.cover_images && originalData.cover_images.length > 0) {
    return originalData.cover_images[0];
  }
  
  // 回退到 recipe.image
  return recipe.image;
}

/**
 * 检查图片URL是否有效
 */
export function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * 创建图片代理URL（如果需要）
 * 如果图片URL无法直接访问，可以通过代理服务器
 */
export function getProxiedImageUrl(url: string): string {
  // 如果图片URL包含 meishichina.com，使用代理
  if (url.includes('meishichina.com')) {
    // 提取路径部分
    const urlObj = new URL(url);
    return `/api/image-proxy${urlObj.pathname}${urlObj.search}`;
  }
  // 其他URL直接返回
  return url;
}

/**
 * 获取图片占位符
 */
export function getImagePlaceholder(text: string): string {
  // 返回一个渐变背景的 data URL
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];
  
  // 根据文本生成一个稳定的索引
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  
  return colors[index];
}

