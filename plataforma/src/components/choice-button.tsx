"use client";

/**
 * Botón de envío que transmite su name/value mediante un campo oculto.
 * Algunos navegadores no incluyen el botón que envió el formulario en el
 * FormData de una server action; así la decisión siempre llega.
 */
export function ChoiceButton({ name, value, className, children }: { name: string; value: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        let hidden = form.querySelector<HTMLInputElement>(`input[type=hidden][data-choice="${name}"]`);
        if (!hidden) {
          hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.name = name;
          hidden.dataset.choice = name;
          form.appendChild(hidden);
        }
        hidden.value = value;
      }}
    >
      {children}
    </button>
  );
}
