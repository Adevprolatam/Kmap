// IMPORTS
import { Routes, Route, Navigate } from "react-router-dom";

import { HomeComponent } from "../app/page/home";
//import { VisitaComponent } from "../Nefrologico/components/visita/Visita";
//import { NavbarComponent, SidebarComponent } from '../shared';
//import { PacienteComponent } from "../Nefrologico/components/paciente/Paciente";
//import { RegistroPacienteComponent } from "../Nefrologico/components/paciente/RegistroPaciente";
//import { RegistroVisitaComponent } from "../Nefrologico/components/visita/RegistroVisitaComponent";
//import {PacienteDetalleComponent}from "../Nefrologico/components/paciente/PacienteComponent"; // Asegúrate de que esta ruta es correcta
//import EstadisticaComponent from "../Nefrologico/components/estadisticas/Estadistica";
//<NavbarComponent />
//<SidebarComponent />
export const AppRouter = () => {
    return (
        <>
            <Routes>
                <Route path="/" element={<Navigate to='/home' />} />
                <Route path="home" element={<HomeComponent />} />
                
            </Routes>
        </>
    );
};
