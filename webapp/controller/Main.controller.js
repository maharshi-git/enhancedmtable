sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("customtableapp.controller.Main", {
        onInit: function () {
            // Generate some hardcoded data 
            var aData = [];
            for (var i = 1; i <= 50; i++) {
                // Nested array for multi-layered demonstration
                var aNestedData = [];
                for (var j = 1; j <= 3; j++) {
                    // Third-layer nesting for deep recursive checks
                    var aDeeplyNestedData = [];
                    for (var k = 1; k <= 2; k++) {
                        aDeeplyNestedData.push({
                            "LogID": i + "-" + j + "-" + k,
                            "Action": "Sub-Action " + k + " recorded",
                            "Completed": k % 2 === 0
                        });
                    }

                    aNestedData.push({
                        "SubLine": j,
                        "Desc": "Nested Item " + j + " for OBJ-" + i,
                        "Amount": Math.floor(Math.random() * 50),
                        "DeeplyNestedItems": aDeeplyNestedData // <--- Level 3 Array
                    });
                }

                aData.push({
                    ID: "OBJ-" + i,
                    Name: "Object Name " + i,
                    Category: "Category " + (i % 5),
                    Status: i % 2 === 0 ? "Active" : "Inactive",
                    Quantity: Math.floor(Math.random() * 100),
                    Price: (Math.random() * 100).toFixed(2),
                    ExtraField1: "Extra Value " + i,
                    ExtraField2: "More Info " + i,
                    NestedItems: aNestedData
                });
            }

            var oModel = new JSONModel({
                tableData: aData
            });

            // Set it to component to make it globally accessible by object ID
            this.getOwnerComponent().setModel(oModel);
            this.getView().setModel(oModel);
        }
    });
});
