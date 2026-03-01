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
                aData.push({
                    ID: "OBJ-" + i,
                    Name: "Object Name " + i,
                    Category: "Category " + (i % 5),
                    Status: i % 2 === 0 ? "Active" : "Inactive",
                    Quantity: Math.floor(Math.random() * 100),
                    Price: (Math.random() * 100).toFixed(2),
                    ExtraField1: "Extra Value " + i,
                    ExtraField2: "More Info " + i,
                    ExtraField3: "Detail " + i,
                    ExtraField4: "Detail " + (i * 10)
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
