import { useState } from 'react';
import { getRecipeImageUrl, getImagePlaceholder, getProxiedImageUrl } from '../utils/imageUtils';

interface RecipeImageProps {
  recipe: any;
  style?: React.CSSProperties;
  className?: string;
  alt?: string;
}

export default function RecipeImage({ recipe, style, className, alt }: RecipeImageProps) {
  const [imageError, setImageError] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const imageUrl = getRecipeImageUrl(recipe);
  const placeholderBg = getImagePlaceholder(recipe.name);

  if (!imageUrl || imageError) {
    return (
      <div
        className={className}
        style={{
          ...style,
          background: placeholderBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: style?.fontSize || '2rem',
          fontWeight: 'bold',
        }}
      >
        {recipe.name.charAt(0)}
      </div>
    );
  }

  // 如果第一次加载失败，尝试使用代理
  const finalUrl = useProxy ? getProxiedImageUrl(imageUrl) : imageUrl;

  return (
    <img
      src={finalUrl}
      alt={alt || recipe.name}
      className={className}
      style={{
        ...style,
        objectFit: 'cover',
      }}
      onError={() => {
        if (!useProxy && imageUrl.includes('meishichina.com')) {
          // 如果直接加载失败且是meishichina.com的图片，尝试使用代理
          setUseProxy(true);
        } else {
          // 代理也失败或不是meishichina.com的图片，显示占位符
          setImageError(true);
        }
      }}
      loading="lazy"
    />
  );
}
