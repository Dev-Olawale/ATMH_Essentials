import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-xs font-medium tracking-[0.18em] whitespace-nowrap uppercase transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        ink: "bg-ink text-white hover:bg-rose-dark",
        // Ink label on rose: white on --rose falls below the WCAG AA contrast ratio.
        rose: "bg-rose text-ink hover:bg-rose-dark hover:text-white",
        ghost: "text-ink hover:bg-blush-deep aria-expanded:bg-blush-deep",
      },
      size: {
        default: "h-11 gap-1.5 px-6",
        sm: "h-10 gap-1 px-3 text-[0.6875rem] tracking-[0.12em]",
        lg: "h-12 gap-1.5 px-8",
        icon: "size-11",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "ink",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "ink",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
