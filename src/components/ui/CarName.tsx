import { Fragment } from "react";

/*
 * Car names come from the source as they are: up to 103 characters, often with
 * trim levels joined by "/" and no spaces ("Longitude/Limited/High Altitude/S").
 *
 * <CarName> prints the whole name and adds a line-break opportunity after every
 * "/" so that such names break between trim levels. Put it inside an element
 * that carries nameWrapClass: that class lets any remaining long token break
 * and, unlike break-words, also lowers the element's minimum width, so a name
 * can never push a table column or a flex item wider than its container.
 *
 * Rule per component: design/DESIGN.md, section 7.1.
 */
export const nameWrapClass = "wrap-anywhere";

export function CarName({ children }: { children: string }) {
  const parts = children.split("/");
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <>
              /<wbr />
            </>
          )}
        </Fragment>
      ))}
    </>
  );
}
