import Image from 'next/image'
import { maxWidthImageLoader } from './lib/prismicImageLoader'

var PrismicDOM = require('prismic-dom')
var Elements = PrismicDOM.RichText.Elements

export default function htmlSerializer(
  type,
  element,
  content,
  children
) {
  switch (type) {
    case Elements.embed:
      return (
        <div
          data-oembed={element.oembed.embed_url}
          data-oembed-type={element.oembed.type}
          data-oembed-provider={
            element.oembed.provider_name
          }
          className="flex w-full items-center justify-center"
          dangerouslySetInnerHTML={{
            __html: element.oembed.html,
          }}
        ></div>
      )

    case Elements.image:
      return (
        <Image
          loader={maxWidthImageLoader}
          src={element.url}
          alt={element.alt || ''}
          width={element.dimensions.width}
          height={element.dimensions.height}
          sizes="100vw"
          className="mx-auto h-auto w-full"
        />
      )

    // Return null to stick with the default behavior for all other elements
    default:
      return null
  }
}
