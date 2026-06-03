"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import type { ElementType } from "react";

type MotionTag = keyof typeof motion;

type MotionSafeProps<T extends MotionTag = "div"> = HTMLMotionProps<T> & {
  as?: T;
};

export function MotionSafe<T extends MotionTag = "div">({
  as,
  children,
  ...props
}: MotionSafeProps<T>) {
  const reduceMotion = useReducedMotion();
  const tag = (as ?? "div") as MotionTag;

  if (reduceMotion) {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileInView: _whileInView,
      whileHover: _whileHover,
      whileTap: _whileTap,
      viewport: _viewport,
      variants: _variants,
      ...rest
    } = props;
    const StaticTag = tag as ElementType;
    return <StaticTag {...rest}>{children}</StaticTag>;
  }

  const MotionTag = motion[tag];
  return <MotionTag {...props}>{children}</MotionTag>;
}
