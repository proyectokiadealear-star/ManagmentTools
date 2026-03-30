Feature: Registro de ubicación jerárquica de activos

  Scenario: Jefe de Taller registra nuevo equipo en ubicación específica
    Given el Jefe de Taller tiene un nuevo equipo "Elevador Hidráulico"
    And el taller tiene configuradas las áreas: Mecánica, Enderezado, Pintura, Lavado, Repuestos
    And cada área tiene Bahías numeradas y Racks identificados
    When selecciona Área "Mecánica", Bahía "Bahía-2", Rack "Rack-A"
    And confirma el registro
    Then el sistema almacena la ubicación estructurada "Mecánica > Bahía-2 > Rack-A"
    And el equipo aparece disponible en esa ubicación para búsquedas y asignaciones

  Scenario: Técnico Líder asigna caja personal a técnico
    Given el Técnico Líder gestiona el área "Enderezado"
    And existe el técnico "Juan Pérez" sin caja asignada
    When le asigna la ubicación "Enderezado > Bahía-1 > Rack-B > Caja-005"
    Then el sistema vincula permanentemente esa caja al técnico
    And el técnico puede consultar su caja y registrar herramientas propias dentro de ella
    And otros técnicos ven que Caja-005 pertenece a Juan Pérez

  Scenario: Actualizar ubicación de activo existente
    Given el Jefe de Taller busca el activo "Compresor Industrial"
    And actualmente está en "Pintura > Bahía-3 > Rack-C"
    When transfiere el activo a "Mecánica > Bahía-1 > Rack-A"
    And registra el motivo: "Reorganización por volumen de trabajo"
    Then el sistema guarda el historial de movimientos con fecha, usuario y motivo
    And la nueva ubicación es inmediatamente visible para todos los usuarios

  Scenario: Intentar registrar activo en ubicación ocupada
    Given el Jefe de Taller intenta registrar un nuevo "Elevador" en "Mecánica > Bahía-2 > Rack-A"
    And esa ubicación ya contiene otro equipo
    When intenta confirmar el registro
    Then el sistema alerta: "Ubicación ocupada por Equipo X - ¿Desea reubicar el existente?"
    And no permite duplicar ubicaciones físicas sin confirmación explícita
