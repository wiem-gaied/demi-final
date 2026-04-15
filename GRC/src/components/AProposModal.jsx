import React from "react";
import { X } from "lucide-react";

const AProposModal = ({ close }) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      
      
      <div className="bg-white w-[800px]  min-h-[500px] rounded-2xl p-8 relative shadow-2xl">
        
        {/* Bouton fermer */}
        <button
          onClick={close}
          className="absolute top-4 right-4"
        >
          <X />
        </button>

        <h2 className="text-2xl font-bold mb-4">
          À propos de notre plateforme
        </h2>
        

        <div className="flex  items-center  justify-between ">
          <p className='text-gray-800'>
            La gouvernance est l’ensemble des règles, responsabilités, décisions et contrôles qui permettent :<br/>
           d’atteindre les objectifs de l’entreprise<br/>
           de gérer les risques<br/>
           de respecter les lois et normes<br/>
           d’assurer la transparence<br/>
           En cybersécurité, elle garantit que la sécurité est alignée avec la stratégie de l’entreprise.<br/>

          </p>
          <img src='/assets/gouvernance.png' className='w-1/3'/>

        </div>
          

      </div>
    </div>
  );
};

export default AProposModal;