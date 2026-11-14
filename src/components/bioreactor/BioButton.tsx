import React from 'react';

export type BioButtonVariant = 'primary' | 'cyber' | 'danger' | 'ghost';

const VARIANT_CLASS: Record<BioButtonVariant, string> = {
  primary: 'btn-bio-primary',
  cyber: 'btn-bio-cyber',
  danger: 'btn-bio-danger',
  ghost: 'btn-bio-ghost',
};

export interface BioButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BioButtonVariant;
}

/** Shared themed button (classes defined in src/index.css). */
export const BioButton: React.FC<BioButtonProps> = ({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}) => (
  <button type={type} className={`btn-bio ${VARIANT_CLASS[variant]} ${className}`.trim()} {...rest} />
);

export default BioButton;
