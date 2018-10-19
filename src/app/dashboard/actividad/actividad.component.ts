import { Component, OnInit, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource,MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { DataService } from '../../service/data.service';
import { HttpErrorResponse } from '@angular/common/http';
import * as firebase from "firebase";
import { Router } from '@angular/router';


@Component({
  selector: 'app-actividad',
  templateUrl: './actividad.component.html',
  styleUrls: ['./actividad.component.scss']
})
export class ActividadComponent implements OnInit {

  element_data: any;
  dataSource: any;
  displayedColumns = ['NOMBRES','APELLIDOS','TELEFONO','DIRECCION','CAMPANA_NOMBRE','accion'];

  dataActividad: any;
  options: any[];       //Opciones separador
  option_sep : any;     //Opcion elegida
  otro_sep: any = '';   //Palabra Clave elegida
  registros: any[] = [];
  totalcam: any = 0;
  totalreg: any = 0;

  constructor(public dataService: DataService,public dialog: MatDialog,private router: Router) {

  }

  ngOnInit() {
    // llamar en Can activate de Dashboard
    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        console.log('No se ha logueado');
        this.router.navigate(['/login'])
      }else{
        console.log('Bienvenido, logueado');
      }
      
    });

    this.obtenerClientes();
    this.contarClientes();
    
  }


  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  obtenerClientes(){
    this.dataService.getClientes().subscribe(data => {
      
      this.dataActividad = data;
      this.element_data = this.dataActividad.data.datos;
      // console.log('rest',this.element_data);
      this.dataSource = new MatTableDataSource(this.element_data);

    },(error: HttpErrorResponse) => {
      console.log ('error:',error);
    });
  }

  contarClientes(){
    this.dataService.countClientes().subscribe(data => {
      
      this.dataActividad = data;
      this.element_data = this.dataActividad.data.datos;
      this.totalcam = this.element_data[0].CAMPANA;
      this.totalreg = this.element_data[0].REGISTRO;
      // console.log('rest contar',this.element_data);

    },(error: HttpErrorResponse) => {
      console.log ('error:',error);
    });
  }

  CrearRegistro(params:any){

    if(params.NOMBRES != '' && params.APELLIDOS != '' && 
       params.TELEFONO != '' && params.DIRECCION != '' &&
       params.CAMPANA_NOMBRE != ''){

        this.dataService.addCliente(params).subscribe(data => {
          // console.log('data post:',data);
          this.obtenerClientes();
          this.contarClientes();
        },(error: HttpErrorResponse) => {
          console.log ('error:',error);
        });
    }else{
      console.log('Registro Vacio');
    }
    
  }

  openDialog(): void {
      
  }

  deleteItem(seq:any,nombre:string,apellido:string){
    console.log('Eliminar',seq);

    if (confirm("Se va a eliminar el cliente "+nombre+" "+apellido+", ¿Desea Continuar?")) {

        this.dataService.deleteCliente(seq).subscribe(data => {
          this.obtenerClientes();
          this.contarClientes();
        },(error: HttpErrorResponse) => {
          console.log ('error:',error);
        });
    } else {
        console.log('Eliminacion cancelada');
    }
   
    
  }

  import(){
    console.log('Se va a importar');
    this.options = [ {"name":","},{"name":"."},{"name":"%"},{"name":"Otro"} ];

    this.registros = []; //reset registros
    this.option_sep = '';
    this.otro_sep = '';   
    
    const dialogRefImp = this.dialog.open(DialogImport, {
      width: '400px',
      data: {options    : this.options,
             option_sep : this.option_sep, //opcion elegida
             otro_sep   : this.otro_sep,
             registros  : this.registros} //otro separador elegido
    });

    dialogRefImp.afterClosed().subscribe(result => {
      console.log('The dialog was closed',result);
      if(result){
         for ( let i = 0; i < result.registros.length; i++) {
            this.CrearRegistro(result.registros[i]);
         }
         alert('Cargue Finalizado');
      }

    });
  }
}

// Dialog Import Component
@Component({
  selector: 'dialog-import',
  templateUrl: 'dialog-import.html',
  styleUrls: ['./actividad.component.scss']
})
export class DialogImport {

  paso            : number = 1;
  columns         : any = [];
  columns_guia    : any = [];
  filename        : any= '';
  filelines       : any = []; 
  numreg          : number = 0;
  options_column  : any = [ {"name":"Nombres"  ,"colname":""},
                            {"name":"Apellidos","colname":""},
                            {"name":"Telefono" ,"colname":""},
                            {"name":"Direccion","colname":""} ];

  constructor(
    public dialogRefimp: MatDialogRef<DialogImport>,
    @Inject(MAT_DIALOG_DATA) public data: any) {}

  onNoClick(): void {
    this.dialogRefimp.close();
  }

  SigPaso(){
    if(this.paso == 1){
      if(!this.data.option_sep){
        alert('Antes de continuar,debe elegir un separador para el archivo a cargar!');
      }else{
        this.paso = this.paso +1;
      }
    }else if(this.paso == 2){
      if(this.filename == ''){
        alert('Antes de continuar, debe cargar un archivo plano!');
      }else{
        this.paso = this.paso +1;
      }
      
    }else if(this.paso == 3){

      if(this.options_column[0].colname == '' || 
         this.options_column[1].colname == '' || 
         this.options_column[2].colname == '' || 
         this.options_column[3].colname == ''){
            alert('Antes de continuar, debe relacionar las columnas a importar!');
      }else if(this.options_column[0].colname != '' && 
               this.options_column[1].colname != '' && 
               this.options_column[2].colname != '' && 
               this.options_column[3].colname != ''){
            
            //Procese
            this.procesar_registros();
            this.paso = this.paso +1;
      }
      
    }
  }

  AntPaso(){
    if(this.paso > 1){
      this.paso = this.paso - 1;
    }
  }

  public changeListener(files: any){

    let sep = '';
    if(this.data.option_sep != 'Otro'){
      sep = this.data.option_sep;
    }else if(this.data.option_sep == 'Otro'){
      sep = this.data.otro_sep;
    }

    let file = files.target.files[0]; //file.name .size .type
    this.filename = file.name;
    let reader: FileReader = new FileReader();
    let lines: any = [];
    let sublines: any = [];
    let contador: number = 0;
    let separador = sep; //';';

    reader.readAsText(file);
    reader.onload = (e) => {
      let csv = reader.result;

      //All Data
      let csvData = String(csv);
      // console.log('csvData: ',csvData);

      //Text Lines
      let allTextLines = csvData.split(/\r?\n|\r/);
      // console.log('allTextLines: ',allTextLines);

      //Headers
      let headers = allTextLines[0].split(separador);
      // console.log('headers: ',headers);

      this.filelines = []; //reset filelines
      this.columns = []; //reset columns
      this.columns_guia = [];
      for ( let i = 0; i < allTextLines.length; i++) {
          if(i==0){
            let head = allTextLines[i].split(separador);
            for ( let h = 0; h < head.length; h++) {

              this.columns_guia.push(head[h]); //setea guia
              let el = {"name":head[h], "state": false}
              this.columns.push(el); //setea columns principal
            }

          }else if(i>0){
            sublines = []; //reset sublines cada line
            let data = allTextLines[i].split(separador);
            if (data.length === headers.length) {
                for ( let j = 0; j < headers.length; j++) {
                    let cont = data[j].split(separador);
                    sublines.push(cont);  //Llena subline por cada line
                } 
            }
            lines.push(sublines);
            contador = contador + 1;
          }
      }

      this.filelines = lines;
      this.numreg = contador;
      // console.log('columns:',this.columns,'filelines: ',this.filelines,'numreg:',this.numreg);

    }


  }

  procesar_registros(){

      // Recorrer lineas e insertar
      for ( let i = 0; i < this.filelines.length; i++) {

            let sublin = this.filelines[i];

            let nombres   = '';
            let apellidos = '';
            let telefono  = '';
            let direccion = '';

            //Recorrer Columnas
            for ( let c = 0; c < this.options_column.length; c++) {
                let col = this.options_column[c];

                let col_key = this.columns_guia.indexOf(col.colname); //Indice de columna asociada

                switch (col.name) {
                  case 'Nombres'  : nombres   = ((sublin[col_key][0] && sublin[col_key][0] != '') ? sublin[col_key][0] : ''); break;
                  case 'Apellidos': apellidos = ((sublin[col_key][0] && sublin[col_key][0] != '') ? sublin[col_key][0] : ''); break;
                  case 'Telefono' : telefono  = ((sublin[col_key][0] && sublin[col_key][0] != '') ? sublin[col_key][0] : ''); break;
                  case 'Direccion': direccion = ((sublin[col_key][0] && sublin[col_key][0] != '') ? sublin[col_key][0] : ''); break;
                  default:     break;
                }
                
            }

            let paramscreate = {
              NOMBRES:      nombres,
              APELLIDOS:    apellidos,
              TELEFONO:     telefono,
              DIRECCION:    direccion,
              CAMPANA_NOMBRE: this.filename.split('.')[0]
            }

            this.data.registros.push(paramscreate);
 

      }
  }

}