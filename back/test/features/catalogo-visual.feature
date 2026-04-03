@smoke @acceptance
Feature: Catálogo visual con geolocalización

  Scenario: Jefe de Taller visualiza activo con detalles completos
    Given el Jefe de Taller consulta la ficha del activo "Llave de Torque Digital"
    When accede a la ficha del activo
    Then visualiza la fotografía principal del activo
    And visualiza la ubicación exacta "Mecánica > Bahía-2 > Rack-A > Caja-003 (Carlos Ruiz)"
    And visualiza el estado operativo del activo
    And visualiza información técnica: marca, modelo, serie, especificaciones
    And visualiza información financiera: costo inicial, valor depreciado, años de uso
    And puede iniciar acciones desde la ficha: solicitar préstamo, ver historial, reportar falla

  Scenario: Personal de Taller busca herramienta para solicitar préstamo
    Given el Personal de Taller "Luis Gómez" necesita un "Multímetro Digital"
    When busca en el catálogo por nombre "Multímetro"
    Then ve listado de herramientas coincidentes
    And cada resultado muestra placa única, ubicación precisa, estado actual y disponibilidad
    And puede iniciar solicitud directamente desde el resultado de búsqueda
    And el sistema verifica en tiempo real si la herramienta sigue disponible

  Scenario: Ver punto central de todos los activos del taller
    Given el Jefe de Taller accede al dashboard principal
    When abre la vista "Vista General del Taller"
    Then visualiza el total de activos registrados
    And visualiza activos en cajas personales con responsable asignado
    And visualiza activos en ubicaciones fijas del taller
    And visualiza activos actualmente en préstamo
    And visualiza activos en mantenimiento
    And puede filtrar por área, tipo de activo, estado operativo
    And al seleccionar cualquier activo accede directamente a su ficha completa

  Scenario: Buscar activo por características técnicas
    Given el Técnico Líder necesita un equipo con capacidad específica
    When filtra por tipo "Elevador", capacidad "3.5 toneladas", estado "disponible"
    Then el sistema muestra solo los activos que cumplen todos los criterios
    And los resultados están ordenados por relevancia
