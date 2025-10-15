"use client";

import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
  tintColor,
  borderColor,
}: {
  items: { title: string; icon: React.ReactNode; href: string }[];
  desktopClassName?: string;
  mobileClassName?: string;
  tintColor?: string;
  borderColor?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} tintColor={tintColor} borderColor={borderColor} />
      <FloatingDockMobile items={items} className={mobileClassName} tintColor={tintColor} borderColor={borderColor} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
  tintColor,
  borderColor,
}: {
  items: { title: string; icon: React.ReactNode; href: string }[];
  className?: string;
  tintColor?: string;
  borderColor?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute bottom-full mb-3 inset-x-0 flex flex-col gap-2"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  scale: 0.8,
                  transition: {
                    delay: idx * 0.05,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
              >
                <Link
                  href={item.href}
                  key={item.title}
                  className="h-12 w-12 rounded-2xl backdrop-blur-xl flex items-center justify-center shadow-lg border hover:scale-110 hover:shadow-xl transition-all duration-300"
                  style={{ backgroundColor: tintColor, borderColor: borderColor }}
                >
                  <div className="h-5 w-5 text-gray-700 dark:text-gray-200">{item.icon}</div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="h-12 w-12 rounded-2xl backdrop-blur-xl flex items-center justify-center shadow-lg border hover:scale-110 hover:shadow-xl transition-all duration-300"
        style={{ backgroundColor: tintColor, borderColor: borderColor }}
      >
        <IconLayoutNavbarCollapse className="h-5 w-5 text-gray-700 dark:text-gray-200" />
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
  tintColor,
  borderColor,
}: {
  items: { title: string; icon: React.ReactNode; href: string }[];
  className?: string;
  tintColor?: string;
  borderColor?: string;
}) => {
  const mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden md:flex h-20 gap-3 items-end rounded-3xl backdrop-blur-2xl px-6 pb-4 shadow-2xl border",
        className
      )}
      style={{ backgroundColor: tintColor, borderColor: borderColor }}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  const heightTransformIcon = useTransform(
    distance,
    [-150, 0, 150],
    [20, 40, 20]
  );

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href}>
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="aspect-square rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center relative hover:shadow-xl transition-shadow duration-300 border border-gray-300/30 dark:border-gray-600/30"
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%", scale: 0.9 }}
              animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
              exit={{ opacity: 0, y: 5, x: "-50%", scale: 0.9 }}
              className="px-3 py-1.5 whitespace-pre rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-xl text-gray-800 dark:text-gray-100 absolute left-1/2 -translate-x-1/2 -top-12 w-fit text-xs font-medium"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className="flex items-center justify-center text-gray-700 dark:text-gray-200"
        >
          {icon}
        </motion.div>
      </motion.div>
    </Link>
  );
}